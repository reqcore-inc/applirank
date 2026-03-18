import { eq, and, desc, sql, count, sum } from 'drizzle-orm'
import { analysisRun, job, application, candidate, aiConfig } from '../../database/schema'

/**
 * GET /api/ai-analysis/stats
 * Returns AI analysis usage statistics for the current organization:
 * - Total runs, completed, failed
 * - Token usage (prompt + completion)
 * - Runs over time (last 30 days, grouped by day)
 * - Recent runs with job/candidate info
 * - Per-model breakdown
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { scoring: ['read'] })
  const orgId = session.session.activeOrganizationId

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

  // Fetch pricing config in parallel with stats
  const pricingConfig = await db.query.aiConfig.findFirst({
    where: eq(aiConfig.organizationId, orgId),
    columns: {
      inputPricePer1m: true,
      outputPricePer1m: true,
    },
  })

  const [
    totalRuns,
    completedRuns,
    failedRuns,
    tokenUsage,
    dailyRuns,
    recentRuns,
    modelBreakdown,
  ] = await Promise.all([
    // 1. Total runs
    db.$count(analysisRun, eq(analysisRun.organizationId, orgId)),

    // 2. Completed runs
    db.$count(analysisRun, and(eq(analysisRun.organizationId, orgId), eq(analysisRun.status, 'completed'))),

    // 3. Failed runs
    db.$count(analysisRun, and(eq(analysisRun.organizationId, orgId), eq(analysisRun.status, 'failed'))),

    // 4. Total token usage
    db
      .select({
        totalPromptTokens: sum(analysisRun.promptTokens).as('total_prompt_tokens'),
        totalCompletionTokens: sum(analysisRun.completionTokens).as('total_completion_tokens'),
      })
      .from(analysisRun)
      .where(eq(analysisRun.organizationId, orgId)),

    // 5. Daily runs (last 30 days)
    db
      .select({
        date: sql<string>`DATE(${analysisRun.createdAt})`.as('date'),
        count: count().as('count'),
        promptTokens: sum(analysisRun.promptTokens).as('prompt_tokens'),
        completionTokens: sum(analysisRun.completionTokens).as('completion_tokens'),
      })
      .from(analysisRun)
      .where(and(
        eq(analysisRun.organizationId, orgId),
        sql`${analysisRun.createdAt} >= ${thirtyDaysAgoISO}`,
      ))
      .groupBy(sql`DATE(${analysisRun.createdAt})`)
      .orderBy(sql`DATE(${analysisRun.createdAt})`),

    // 6. Recent runs (last 20)
    db
      .select({
        id: analysisRun.id,
        status: analysisRun.status,
        provider: analysisRun.provider,
        model: analysisRun.model,
        compositeScore: analysisRun.compositeScore,
        promptTokens: analysisRun.promptTokens,
        completionTokens: analysisRun.completionTokens,
        createdAt: analysisRun.createdAt,
        candidateFirstName: candidate.firstName,
        candidateLastName: candidate.lastName,
        jobTitle: job.title,
      })
      .from(analysisRun)
      .innerJoin(application, eq(application.id, analysisRun.applicationId))
      .innerJoin(candidate, eq(candidate.id, application.candidateId))
      .innerJoin(job, eq(job.id, application.jobId))
      .where(eq(analysisRun.organizationId, orgId))
      .orderBy(desc(analysisRun.createdAt))
      .limit(20),

    // 7. Per-model breakdown
    db
      .select({
        provider: analysisRun.provider,
        model: analysisRun.model,
        runCount: count().as('run_count'),
        totalPromptTokens: sum(analysisRun.promptTokens).as('total_prompt_tokens'),
        totalCompletionTokens: sum(analysisRun.completionTokens).as('total_completion_tokens'),
      })
      .from(analysisRun)
      .where(eq(analysisRun.organizationId, orgId))
      .groupBy(analysisRun.provider, analysisRun.model),
  ])

  const usage = tokenUsage[0]

  const inputPrice = pricingConfig?.inputPricePer1m ? Number(pricingConfig.inputPricePer1m) : null
  const outputPrice = pricingConfig?.outputPricePer1m ? Number(pricingConfig.outputPricePer1m) : null

  return {
    pricing: {
      inputPricePer1m: inputPrice,
      outputPricePer1m: outputPrice,
      configured: inputPrice != null || outputPrice != null,
    },
    summary: {
      totalRuns: Number(totalRuns),
      completedRuns: Number(completedRuns),
      failedRuns: Number(failedRuns),
      totalPromptTokens: Number(usage?.totalPromptTokens ?? 0),
      totalCompletionTokens: Number(usage?.totalCompletionTokens ?? 0),
      totalTokens: Number(usage?.totalPromptTokens ?? 0) + Number(usage?.totalCompletionTokens ?? 0),
    },
    dailyRuns: dailyRuns.map(d => ({
      date: d.date,
      count: Number(d.count),
      promptTokens: Number(d.promptTokens ?? 0),
      completionTokens: Number(d.completionTokens ?? 0),
    })),
    recentRuns: recentRuns.map(r => ({
      id: r.id,
      status: r.status,
      provider: r.provider,
      model: r.model,
      compositeScore: r.compositeScore,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      createdAt: r.createdAt,
      candidateName: `${r.candidateFirstName} ${r.candidateLastName}`,
      jobTitle: r.jobTitle,
    })),
    modelBreakdown: modelBreakdown.map(m => ({
      provider: m.provider,
      model: m.model,
      runCount: Number(m.runCount),
      totalPromptTokens: Number(m.totalPromptTokens ?? 0),
      totalCompletionTokens: Number(m.totalCompletionTokens ?? 0),
      totalTokens: Number(m.totalPromptTokens ?? 0) + Number(m.totalCompletionTokens ?? 0),
    })),
  }
})
