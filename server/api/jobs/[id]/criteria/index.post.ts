import { eq, and } from 'drizzle-orm'
import { scoringCriterion, job } from '../../../../database/schema'
import { bulkCriteriaSchema } from '../../../../utils/schemas/scoring'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.string().min(1) })

/**
 * POST /api/jobs/:id/criteria
 * Bulk-create scoring criteria for a job. Replaces any existing criteria.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { scoring: ['create'] })
  const orgId = session.session.activeOrganizationId
  const { id: jobId } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, bulkCriteriaSchema.parse)

  // Verify job belongs to org
  const jobRecord = await db.query.job.findFirst({
    where: and(eq(job.id, jobId), eq(job.organizationId, orgId)),
    columns: { id: true },
  })
  if (!jobRecord) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  // Delete existing criteria for this job (replace strategy)
  await db.delete(scoringCriterion)
    .where(and(
      eq(scoringCriterion.jobId, jobId),
      eq(scoringCriterion.organizationId, orgId),
    ))

  // Insert new criteria
  const values = body.criteria.map((c, index) => ({
    organizationId: orgId,
    jobId,
    key: c.key,
    name: c.name,
    description: c.description ?? null,
    category: c.category,
    maxScore: c.maxScore,
    weight: c.weight,
    displayOrder: c.displayOrder ?? index,
  }))

  const created = await db.insert(scoringCriterion)
    .values(values)
    .returning()

  recordActivity({
    organizationId: orgId,
    actorId: session.user.id,
    action: 'created',
    resourceType: 'scoringCriteria',
    resourceId: jobId,
    metadata: { count: created.length },
  })

  setResponseStatus(event, 201)
  return { criteria: created }
})
