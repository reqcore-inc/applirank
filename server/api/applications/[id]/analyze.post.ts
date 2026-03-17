import { eq, and } from 'drizzle-orm'
import {
  application, aiConfig, scoringCriterion, criterionScore,
  analysisRun, document, candidate,
} from '../../../database/schema'
import { scoreApplication, computeCompositeScore } from '../../../utils/ai/scoring'
import type { CriterionDefinition } from '../../../utils/ai/scoring'
import { extractResumeText } from '../../../utils/resume-parser'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.string().min(1) })

/**
 * POST /api/applications/:id/analyze
 * Run AI analysis on a single application. Scores the candidate against job criteria.
 * Stores individual criterion scores + composite score + audit trail.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { scoring: ['create'] })
  const orgId = session.session.activeOrganizationId
  const { id: applicationId } = await getValidatedRouterParams(event, paramsSchema.parse)

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

  // Fetch AI config
  const config = await db.query.aiConfig.findFirst({
    where: eq(aiConfig.organizationId, orgId),
  })
  if (!config) {
    throw createError({
      statusCode: 422,
      statusMessage: 'AI provider not configured. Set up your AI provider in Settings first.',
    })
  }

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
    throw createError({
      statusCode: 422,
      statusMessage: 'No parsed resume found for this candidate. Upload a resume first.',
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
    provider: config.provider as 'openai' | 'anthropic' | 'openai_compatible',
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

  // Delete previous scores for this application (replace strategy)
  await db.delete(criterionScore)
    .where(and(
      eq(criterionScore.applicationId, applicationId),
      eq(criterionScore.organizationId, orgId),
    ))

  // Insert individual criterion scores
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

  if (scoreValues.length > 0) {
    await db.insert(criterionScore).values(scoreValues)
  }

  // Update application composite score
  await db.update(application)
    .set({ score: compositeScore, updatedAt: new Date() })
    .where(eq(application.id, applicationId))

  // Record analysis run
  const [run] = await db.insert(analysisRun).values({
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
