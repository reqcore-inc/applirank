import { eq, and } from 'drizzle-orm'
import { scoringCriterion, job } from '../../../../database/schema'
import { updateWeightsSchema } from '../../../../utils/schemas/scoring'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.string().min(1) })

/**
 * PATCH /api/jobs/:id/criteria
 * Update weights for scoring criteria (slider adjustments).
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { scoring: ['update'] })
  const orgId = session.session.activeOrganizationId
  const { id: jobId } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, updateWeightsSchema.parse)

  // Verify job belongs to org
  const jobRecord = await db.query.job.findFirst({
    where: and(eq(job.id, jobId), eq(job.organizationId, orgId)),
    columns: { id: true },
  })
  if (!jobRecord) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  // Update each criterion weight
  await Promise.all(
    body.weights.map(w =>
      db.update(scoringCriterion)
        .set({ weight: w.weight, updatedAt: new Date() })
        .where(and(
          eq(scoringCriterion.jobId, jobId),
          eq(scoringCriterion.organizationId, orgId),
          eq(scoringCriterion.key, w.key),
        )),
    ),
  )

  // Return updated criteria
  const criteria = await db.select()
    .from(scoringCriterion)
    .where(and(
      eq(scoringCriterion.jobId, jobId),
      eq(scoringCriterion.organizationId, orgId),
    ))

  return { criteria }
})
