import { eq, and } from 'drizzle-orm'
import { job } from '../../database/schema'
import { idParamSchema } from '../../utils/schemas/job'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

  const { id } = await getValidatedRouterParams(event, idParamSchema.parse)

  const result = await db.query.job.findFirst({
    where: and(eq(job.id, id), eq(job.organizationId, orgId)),
    with: {
      applications: {
        columns: { id: true, candidateId: true, status: true, createdAt: true },
        limit: 100,
      },
    },
  })

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  return result
})
