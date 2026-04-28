/**
 * Fire-and-forget AI scoring for a single application.
 * Called when autoScoreOnApply is enabled on a job.
 * Silently skips if AI config, criteria, or resume are missing.
 */
import { eq, and } from 'drizzle-orm'
import {
  application, scoringCriterion, criterionScore,
  analysisRun, document,
} from '../../database/schema'
import { scoreApplication, computeCompositeScore } from './scoring'
import type { CriterionDefinition } from './scoring'
import type { SupportedProvider } from './provider'
import { loadAiConfig } from './loadConfig'
import { extractResumeText } from '../resume-parser'

export async function autoScoreApplication(applicationId: string, orgId: string) {
  const app = await db.query.application.findFirst({
    where: and(eq(application.id, applicationId), eq(application.organizationId, orgId)),
    with: {
      candidate: { columns: { id: true, firstName: true, lastName: true } },
      job: { columns: { id: true, title: true, description: true } },
    },
  })
  if (!app) return

  let config
  try {
    config = await loadAiConfig(orgId, { purpose: 'analysis' })
  } catch {
    return
  }

  const criteria = await db.select().from(scoringCriterion)
    .where(and(
      eq(scoringCriterion.jobId, app.job.id),
      eq(scoringCriterion.organizationId, orgId),
    ))
  if (criteria.length === 0) return

  const docs = await db.select({ parsedContent: document.parsedContent, type: document.type })
    .from(document)
    .where(and(eq(document.candidateId, app.candidate.id), eq(document.organizationId, orgId)))

  const resumeDoc = docs.find(d => d.type === 'resume')
  const resumeText = extractResumeText(resumeDoc?.parsedContent)
  if (!resumeText) return

  if (!app.job.description) return

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
    await db.insert(analysisRun).values({
      organizationId: orgId,
      applicationId,
      status: 'failed',
      provider: config.provider,
      model: config.model,
      criteriaSnapshot: criteriaDefinitions as any,
      errorMessage: err?.message ?? 'Unknown error',
    })
    return
  }

  const compositeScore = computeCompositeScore(criteriaDefinitions, result.scoring.evaluations)

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

  await db.transaction(async (tx) => {
    await tx.delete(criterionScore)
      .where(and(
        eq(criterionScore.applicationId, applicationId),
        eq(criterionScore.organizationId, orgId),
      ))

    if (scoreValues.length > 0) {
      await tx.insert(criterionScore).values(scoreValues)
    }

    await tx.update(application)
      .set({ score: compositeScore, updatedAt: new Date() })
      .where(eq(application.id, applicationId))

    await tx.insert(analysisRun).values({
      organizationId: orgId,
      applicationId,
      status: 'completed',
      provider: config.provider,
      model: config.model,
      criteriaSnapshot: criteriaDefinitions as any,
      compositeScore,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    })
  })
}
