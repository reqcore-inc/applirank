import { eq, and } from 'drizzle-orm'
import {
  application, scoringCriterion, criterionScore,
  analysisRun, document, candidate,
} from '../../../database/schema'
import { scoreApplication, computeCompositeScore } from '../../../utils/ai/scoring'
import type { CriterionDefinition } from '../../../utils/ai/scoring'
import type { SupportedProvider } from '../../../utils/ai/provider'
import { loadAiConfig } from '../../../utils/ai/loadConfig'
import { extractResumeText } from '../../../utils/resume-parser'
import { createRateLimiter } from '../../../utils/rateLimit'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.string().min(1) })
const bodySchema = z.object({
  /** Optional override; falls back to the org's analysis default. */
  aiConfigId: z.string().min(1).nullable().optional(),
}).partial().optional()
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20, message: 'Too many AI analysis requests. Please wait before retrying.' })

/**
 * POST /api/applications/:id/analyze
 * Run AI analysis on a single application. Scores the candidate against job criteria.
 * Stores individual criterion scores + composite score + audit trail.
 */
export default defineEventHandler(async (event) => {
  await limiter(event)
  const session = await requirePermission(event, { scoring: ['create'] })
  const orgId = session.session.activeOrganizationId
  const { id: applicationId } = await getValidatedRouterParams(event, paramsSchema.parse)
  // Body is optional — GET-style "just run with defaults" stays valid.
  const body = await readBody(event).catch(() => null)
  const parsedBody = body ? bodySchema.parse(body) : null

  // Fetch application with candidate, job, and documents
  const app = await db.query.application.findFirst({
    where: and(eq(application.id, applicationId), eq(application.organizationId, orgId)),
    with: {
      candidate: {
        columns: { id: true, firstName: true, lastName: true },
      },
      job: {
        columns: { id: true, title: true, description: true },
      },
    },
  })

  if (!app) {
    throw createError({ statusCode: 404, statusMessage: 'Application not found' })
  }

  // Fetch AI config (override → analysis default → 422)
  const config = await loadAiConfig(orgId, {
    purpose: 'analysis',
    preferId: parsedBody?.aiConfigId ?? null,
  })

  // Fetch scoring criteria for this job
  const criteria = await db.select().from(scoringCriterion)
    .where(and(
      eq(scoringCriterion.jobId, app.job.id),
      eq(scoringCriterion.organizationId, orgId),
    ))

  if (criteria.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'No scoring criteria defined for this job. Add criteria first.',
    })
  }

  // Fetch candidate documents (resume text)
  const docs = await db.select({
    id: document.id,
    parsedContent: document.parsedContent,
    type: document.type,
  })
    .from(document)
    .where(and(
      eq(document.candidateId, app.candidate.id),
      eq(document.organizationId, orgId),
    ))

  const resumeDoc = docs.find(d => d.type === 'resume')
  const resumeText = extractResumeText(resumeDoc?.parsedContent)

  if (!resumeText) {
    // Resume document exists but parsing failed or was incomplete
    if (resumeDoc) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Resume was uploaded but text extraction failed. Try re-parsing the document.',
        data: { code: 'PARSE_FAILED', documentId: resumeDoc.id },
      })
    }
    throw createError({
      statusCode: 422,
      statusMessage: 'No resume found for this candidate. Upload a resume first.',
    })
  }

  if (!app.job.description) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Job description is required for AI analysis.',
    })
  }

  const criteriaDefinitions: CriterionDefinition[] = criteria.map(c => ({
    key: c.key,
    name: c.name,
    description: c.description,
    category: c.category,
    maxScore: c.maxScore,
    weight: c.weight,
  }))

  const providerConfig = {
    provider: config.provider as SupportedProvider,
    model: config.model,
    apiKeyEncrypted: config.apiKeyEncrypted,
    baseUrl: config.baseUrl,
    maxTokens: config.maxTokens,
  }

  let result
  try {
    result = await scoreApplication(providerConfig, {
      jobTitle: app.job.title,
      jobDescription: app.job.description,
      criteria: criteriaDefinitions,
      resumeText,
      coverLetterText: app.coverLetterText,
      applicationNotes: app.notes,
    })
  } catch (err: any) {
    // Record failed analysis run
    await db.insert(analysisRun).values({
      organizationId: orgId,
      applicationId,
      status: 'failed',
      provider: config.provider,
      model: config.model,
      criteriaSnapshot: criteriaDefinitions as any,
      errorMessage: err?.message ?? 'Unknown error',
      scoredById: session.user.id,
    })

    throw createError({
      statusCode: 502,
      statusMessage: `AI analysis failed: ${err?.message ?? 'Unknown error'}`,
    })
  }

  // Compute composite score
  const compositeScore = computeCompositeScore(criteriaDefinitions, result.scoring.evaluations)

  // Insert scores, update application, and record run atomically
  const scoreValues = result.scoring.evaluations.map(evaluation => ({
    organizationId: orgId,
    applicationId,
    criterionKey: evaluation.criterionKey,
    maxScore: evaluation.maxScore,
    applicantScore: evaluation.applicantScore,
    confidence: evaluation.confidence,
    evidence: evaluation.evidence,
    strengths: evaluation.strengths,
    gaps: evaluation.gaps,
  }))

  const [run] = await db.transaction(async (tx) => {
    // Delete previous scores for this application (replace strategy)
    await tx.delete(criterionScore)
      .where(and(
        eq(criterionScore.applicationId, applicationId),
        eq(criterionScore.organizationId, orgId),
      ))

    if (scoreValues.length > 0) {
      await tx.insert(criterionScore).values(scoreValues)
    }

    // Update application composite score
    await tx.update(application)
      .set({ score: compositeScore, updatedAt: new Date() })
      .where(eq(application.id, applicationId))

    // Record analysis run
    return tx.insert(analysisRun).values({
      organizationId: orgId,
      applicationId,
      status: 'completed',
      provider: config.provider,
      model: config.model,
      criteriaSnapshot: criteriaDefinitions as any,
      compositeScore,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      scoredById: session.user.id,
    }).returning()
  })

  recordActivity({
    organizationId: orgId,
    actorId: session.user.id,
    action: 'scored',
    resourceType: 'application',
    resourceId: applicationId,
    metadata: {
      compositeScore,
      model: config.model,
      criterionCount: result.scoring.evaluations.length,
    },
  })

  return {
    compositeScore,
    evaluations: result.scoring.evaluations,
    summary: result.scoring.summary,
    analysisRunId: run!.id,
    usage: result.usage,
  }
})
