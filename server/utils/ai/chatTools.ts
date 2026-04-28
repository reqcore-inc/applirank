/**
 * Chatbot tools — give the LLM safe, org-scoped read access to ATS data.
 *
 * Every tool:
 *   - Accepts a `ChatbotToolContext` with the authenticated org id and scope.
 *   - Re-validates the scope on every call (defence-in-depth — never trust the
 *     model to honour scope itself).
 *   - Returns plain JSON-serializable objects with only the fields useful to
 *     the model (no secrets, no internal IDs the user wouldn't recognise).
 *
 * Tools are intentionally small and composable. The model is expected to call
 * `list_*` to discover IDs, then `get_*` to fetch details.
 */
import { tool } from 'ai'
import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import {
  application,
  candidate,
  comment,
  criterionScore,
  document,
  interview,
  job,
  scoringCriterion,
} from '../../database/schema'
import { downloadFromS3 } from '../s3'
import { parseDocument } from '../resume-parser'
import type { ChatbotScope } from '../../../shared/chatbot'
import {
  CHATBOT_MAX_ATTACHMENT_CHARS,
  type ChatbotAttachment,
} from '../../../shared/chatbot'

export interface ChatbotToolContext {
  orgId: string
  scope: ChatbotScope
  /** Attachments uploaded with the current user message. */
  attachments: Array<ChatbotAttachment & { text: string }>
}

/** Throw if the requested job is outside the active scope. */
function assertJobInScope(scope: ChatbotScope, jobId: string) {
  if (scope.kind === 'job' && scope.jobId && scope.jobId !== jobId) {
    throw new Error(`Job ${jobId} is outside the active scope.`)
  }
}

/** Build the org-scoped job filter, narrowed to the active scope when needed. */
function jobScopeFilter(orgId: string, scope: ChatbotScope) {
  const base = eq(job.organizationId, orgId)
  if (scope.kind === 'job' && scope.jobId) {
    return and(base, eq(job.id, scope.jobId))
  }
  return base
}

/** Truncate long text to keep the model context manageable. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}\n…[truncated, original length ${text.length} chars]`
}

export function buildChatbotTools(ctx: ChatbotToolContext) {
  return {
    list_jobs: tool({
      description:
        'List jobs in the organization. Use this to find a job ID before drilling into its applications/candidates. ' +
        'Returns id, title, status, location and application count for each job.',
      inputSchema: z.object({
        status: z.enum(['draft', 'open', 'closed', 'archived']).optional()
          .describe('Filter by job status. Omit to list all.'),
        search: z.string().optional()
          .describe('Case-insensitive substring match on job title.'),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ status, search, limit }) => {
        const conditions = [jobScopeFilter(ctx.orgId, ctx.scope)]
        if (status) conditions.push(eq(job.status, status))
        if (search) conditions.push(ilike(job.title, `%${search}%`))

        const rows = await db.query.job.findMany({
          where: and(...conditions),
          orderBy: [desc(job.createdAt)],
          limit,
          columns: {
            id: true, title: true, status: true, location: true, type: true,
            description: true, createdAt: true,
          },
        })
        return rows.map((j) => ({
          id: j.id,
          title: j.title,
          status: j.status,
          location: j.location,
          type: j.type,
          createdAt: j.createdAt,
        }))
      },
    }),

    get_job: tool({
      description:
        'Get full details for a single job, including description, salary, scoring criteria, and pipeline counts.',
      inputSchema: z.object({
        jobId: z.string().min(1),
      }),
      execute: async ({ jobId }) => {
        assertJobInScope(ctx.scope, jobId)
        const j = await db.query.job.findFirst({
          where: and(eq(job.organizationId, ctx.orgId), eq(job.id, jobId)),
        })
        if (!j) throw new Error(`Job ${jobId} not found.`)

        const criteria = await db.query.scoringCriterion.findMany({
          where: and(
            eq(scoringCriterion.organizationId, ctx.orgId),
            eq(scoringCriterion.jobId, jobId),
          ),
          columns: { name: true, description: true, key: true },
        })

        return {
          id: j.id,
          title: j.title,
          status: j.status,
          location: j.location,
          type: j.type,
          experienceLevel: j.experienceLevel,
          remoteStatus: j.remoteStatus,
          salary: j.salaryMin || j.salaryMax
            ? {
                min: j.salaryMin, max: j.salaryMax,
                currency: j.salaryCurrency, unit: j.salaryUnit,
                negotiable: j.salaryNegotiable,
              }
            : null,
          description: truncate(j.description ?? '', 4000),
          scoringCriteria: criteria,
          createdAt: j.createdAt,
        }
      },
    }),

    list_applications: tool({
      description:
        'List applications (candidate ↔ job links) for a given job. ' +
        'Returns candidate name, email, application status, score, and ids — ' +
        'use get_candidate / read_resume for deeper analysis.',
      inputSchema: z.object({
        jobId: z.string().min(1).describe('The job to list applications for.'),
        status: z.enum(['new', 'screening', 'interview', 'offer', 'hired', 'rejected']).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
      execute: async ({ jobId, status, limit }) => {
        assertJobInScope(ctx.scope, jobId)
        const conditions = [
          eq(application.organizationId, ctx.orgId),
          eq(application.jobId, jobId),
        ]
        if (status) conditions.push(eq(application.status, status))

        const rows = await db.query.application.findMany({
          where: and(...conditions),
          orderBy: [desc(application.score), desc(application.createdAt)],
          limit,
          with: {
            candidate: {
              columns: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        })
        return rows.map((a) => ({
          applicationId: a.id,
          candidateId: a.candidateId,
          candidateName: `${a.candidate.firstName} ${a.candidate.lastName}`.trim(),
          candidateEmail: a.candidate.email,
          status: a.status,
          score: a.score,
          createdAt: a.createdAt,
        }))
      },
    }),

    search_candidates: tool({
      description:
        'Search candidates across the organization by name or email. ' +
        'Returns id, name, email, and matched application count.',
      inputSchema: z.object({
        query: z.string().min(1).describe('Substring to match against name or email.'),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ query, limit }) => {
        const like = `%${query}%`
        const rows = await db.query.candidate.findMany({
          where: and(
            eq(candidate.organizationId, ctx.orgId),
            or(
              ilike(candidate.firstName, like),
              ilike(candidate.lastName, like),
              ilike(candidate.email, like),
            ),
          ),
          orderBy: [desc(candidate.createdAt)],
          limit,
          columns: { id: true, firstName: true, lastName: true, email: true, phone: true },
        })

        // If we're scoped to a job, filter to candidates who applied to it.
        if (ctx.scope.kind === 'job' && ctx.scope.jobId) {
          if (rows.length === 0) return []
          const apps = await db.query.application.findMany({
            where: and(
              eq(application.organizationId, ctx.orgId),
              eq(application.jobId, ctx.scope.jobId),
              inArray(application.candidateId, rows.map((c) => c.id)),
            ),
            columns: { candidateId: true },
          })
          const allowed = new Set(apps.map((a) => a.candidateId))
          return rows
            .filter((c) => allowed.has(c.id))
            .map((c) => ({
              id: c.id,
              name: `${c.firstName} ${c.lastName}`.trim(),
              email: c.email,
              phone: c.phone,
            }))
        }

        return rows.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`.trim(),
          email: c.email,
          phone: c.phone,
        }))
      },
    }),

    get_candidate: tool({
      description:
        'Get full details for one candidate: contact info, all applications (job, status, score), ' +
        'attached documents (resumes, etc.), interviews, and recent comments. ' +
        'Use read_resume to read a specific document.',
      inputSchema: z.object({
        candidateId: z.string().min(1),
      }),
      execute: async ({ candidateId }) => {
        const c = await db.query.candidate.findFirst({
          where: and(
            eq(candidate.organizationId, ctx.orgId),
            eq(candidate.id, candidateId),
          ),
        })
        if (!c) throw new Error(`Candidate ${candidateId} not found.`)

        // Load applications + restrict to scope when set.
        const appConditions = [
          eq(application.organizationId, ctx.orgId),
          eq(application.candidateId, candidateId),
        ]
        if (ctx.scope.kind === 'job' && ctx.scope.jobId) {
          appConditions.push(eq(application.jobId, ctx.scope.jobId))
        }
        const apps = await db.query.application.findMany({
          where: and(...appConditions),
          with: {
            job: { columns: { id: true, title: true, status: true } },
          },
        })

        if (ctx.scope.kind === 'job' && ctx.scope.jobId && apps.length === 0) {
          throw new Error('Candidate is not part of the active job scope.')
        }

        const docs = await db.query.document.findMany({
          where: and(
            eq(document.organizationId, ctx.orgId),
            eq(document.candidateId, candidateId),
          ),
          columns: {
            id: true, type: true, originalFilename: true, mimeType: true, sizeBytes: true,
          },
        })

        const interviews = apps.length === 0
          ? []
          : await db.query.interview.findMany({
              where: and(
                eq(interview.organizationId, ctx.orgId),
                inArray(interview.applicationId, apps.map((a) => a.id)),
              ),
              columns: {
                id: true, title: true, type: true, status: true,
                scheduledAt: true, duration: true, notes: true,
              },
              limit: 20,
            })

        const targetIds = [c.id, ...apps.map((a) => a.id)]
        const recentComments = await db.query.comment.findMany({
          where: and(
            eq(comment.organizationId, ctx.orgId),
            inArray(comment.targetId, targetIds),
          ),
          orderBy: [desc(comment.createdAt)],
          limit: 10,
          columns: { body: true, createdAt: true, targetType: true },
        })

        return {
          id: c.id,
          name: `${c.firstName} ${c.lastName}`.trim(),
          email: c.email,
          phone: c.phone,
          gender: c.gender,
          dateOfBirth: c.dateOfBirth,
          quickNotes: c.quickNotes,
          applications: apps.map((a) => ({
            id: a.id,
            status: a.status,
            score: a.score,
            notes: a.notes,
            jobId: a.job.id,
            jobTitle: a.job.title,
            jobStatus: a.job.status,
            createdAt: a.createdAt,
          })),
          documents: docs,
          interviews,
          recentComments,
        }
      },
    }),

    read_resume: tool({
      description:
        'Read the parsed text content of a candidate\'s document (resume, cover letter, etc.). ' +
        'Use the documentId returned by get_candidate.',
      inputSchema: z.object({
        documentId: z.string().min(1),
      }),
      execute: async ({ documentId }) => {
        const doc = await db.query.document.findFirst({
          where: and(
            eq(document.organizationId, ctx.orgId),
            eq(document.id, documentId),
          ),
        })
        if (!doc) throw new Error(`Document ${documentId} not found.`)

        // Scope check: candidate must be in scope.
        if (ctx.scope.kind === 'job' && ctx.scope.jobId) {
          const inScope = await db.query.application.findFirst({
            where: and(
              eq(application.organizationId, ctx.orgId),
              eq(application.jobId, ctx.scope.jobId),
              eq(application.candidateId, doc.candidateId),
            ),
            columns: { id: true },
          })
          if (!inScope) throw new Error('Document is outside the active job scope.')
        }

        // Prefer pre-parsed content stored at upload time.
        const parsed = doc.parsedContent as { text?: string } | null
        if (parsed?.text) {
          return {
            documentId: doc.id,
            filename: doc.originalFilename,
            mimeType: doc.mimeType,
            text: truncate(parsed.text, CHATBOT_MAX_ATTACHMENT_CHARS),
          }
        }

        // Fall back to live parsing from S3.
        const buf = await downloadFromS3(doc.storageKey)
        const re = await parseDocument(buf, doc.mimeType)
        if (!re?.text) throw new Error('Document could not be parsed.')
        return {
          documentId: doc.id,
          filename: doc.originalFilename,
          mimeType: doc.mimeType,
          text: truncate(re.text, CHATBOT_MAX_ATTACHMENT_CHARS),
        }
      },
    }),

    get_application_scores: tool({
      description:
        'Fetch the AI scoring breakdown for a single application: per-criterion scores, ' +
        'rationale, strengths, and concerns. Use this when the user asks "why" a candidate scored as they did.',
      inputSchema: z.object({
        applicationId: z.string().min(1),
      }),
      execute: async ({ applicationId }) => {
        const app = await db.query.application.findFirst({
          where: and(
            eq(application.organizationId, ctx.orgId),
            eq(application.id, applicationId),
          ),
          columns: { id: true, score: true, jobId: true },
        })
        if (!app) throw new Error(`Application ${applicationId} not found.`)
        assertJobInScope(ctx.scope, app.jobId)

        const scores = await db.query.criterionScore.findMany({
          where: and(
            eq(criterionScore.organizationId, ctx.orgId),
            eq(criterionScore.applicationId, applicationId),
          ),
        })

        // Resolve criterion metadata via the job's scoring rubric.
        const rubric = await db.query.scoringCriterion.findMany({
          where: and(
            eq(scoringCriterion.organizationId, ctx.orgId),
            eq(scoringCriterion.jobId, app.jobId),
          ),
          columns: { key: true, name: true, description: true },
        })
        const rubricByKey = new Map(rubric.map((r) => [r.key, r]))

        return {
          applicationId: app.id,
          compositeScore: app.score,
          criteria: scores.map((s) => {
            const meta = rubricByKey.get(s.criterionKey)
            return {
              key: s.criterionKey,
              name: meta?.name ?? s.criterionKey,
              description: meta?.description ?? null,
              score: s.applicantScore,
              maxScore: s.maxScore,
              confidence: s.confidence,
              evidence: s.evidence,
              strengths: s.strengths ?? [],
              gaps: s.gaps ?? [],
            }
          }),
        }
      },
    }),

    list_attachments: tool({
      description:
        'List the files the user uploaded in the current message. Use read_attachment to get their text.',
      inputSchema: z.object({}),
      execute: async () => {
        return ctx.attachments.map((a) => ({
          id: a.id,
          filename: a.filename,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          textLength: a.textLength,
        }))
      },
    }),

    read_attachment: tool({
      description: 'Read the extracted text of an attachment uploaded by the user in the current message.',
      inputSchema: z.object({
        attachmentId: z.string().min(1),
      }),
      execute: async ({ attachmentId }) => {
        const att = ctx.attachments.find((a) => a.id === attachmentId)
        if (!att) throw new Error(`Attachment ${attachmentId} not found in this message.`)
        return {
          id: att.id,
          filename: att.filename,
          mimeType: att.mimeType,
          text: truncate(att.text, CHATBOT_MAX_ATTACHMENT_CHARS),
        }
      },
    }),
  }
}

export type ChatbotToolSet = ReturnType<typeof buildChatbotTools>
