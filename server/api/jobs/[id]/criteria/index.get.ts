import { eq, and, asc } from 'drizzle-orm'
import { scoringCriterion, job } from '../../../../database/schema'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.string().min(1) })

/**
 * GET /api/jobs/:id/criteria
 * List all scoring criteria for a job, ordered by displayOrder.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { scoring: ['read'] })
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

  const criteria = await db.select()
    .from(scoringCriterion)
    .where(and(
      eq(scoringCriterion.jobId, jobId),
      eq(scoringCriterion.organizationId, orgId),
    ))
    .orderBy(asc(scoringCriterion.displayOrder))

  return { criteria }
})
