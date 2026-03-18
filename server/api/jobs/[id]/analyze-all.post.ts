import { eq, and, isNull } from 'drizzle-orm'
import { application, job } from '../../../database/schema'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.string().min(1) })

/**
 * POST /api/jobs/:id/analyze-all
 * Trigger AI analysis for all unscored applications for a job.
 * Returns the list of application IDs that were queued for analysis.
 * Client should call /api/applications/:id/analyze for each one.
 * This keeps the operation simple and avoids long-running server requests.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { scoring: ['create'] })
  const orgId = session.session.activeOrganizationId
  const { id: jobId } = await getValidatedRouterParams(event, paramsSchema.parse)

  // Verify job belongs to org
  const jobRecord = await db.query.job.findFirst({
    where: and(eq(job.id, jobId), eq(job.organizationId, orgId)),
    columns: { id: true },
  })
  if (!jobRecord) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  // Find all applications without scores
  const unscoredApps = await db.select({
    id: application.id,
  })
    .from(application)
    .where(and(
      eq(application.jobId, jobId),
      eq(application.organizationId, orgId),
      isNull(application.score),
    ))

  return {
    applicationIds: unscoredApps.map(a => a.id),
    total: unscoredApps.length,
  }
})
