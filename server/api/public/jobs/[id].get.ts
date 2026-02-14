import { eq, and, asc } from 'drizzle-orm'
import { job } from '../../../database/schema'
import { publicJobIdSchema } from '../../../utils/schemas/publicApplication'

/**
 * GET /api/public/jobs/:id
 * Returns job details + custom questions for an open job.
 * No auth required — this is the public-facing endpoint for applicants.
 */
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, publicJobIdSchema.parse)

  const result = await db.query.job.findFirst({
    where: and(eq(job.id, id), eq(job.status, 'open')),
    columns: {
      id: true,
      title: true,
      description: true,
      location: true,
      type: true,
      status: true,
      createdAt: true,
    },
    with: {
      questions: {
        orderBy: (q, { asc }) => [asc(q.displayOrder), asc(q.createdAt)],
        columns: {
          id: true,
          type: true,
          label: true,
          description: true,
          required: true,
          options: true,
          displayOrder: true,
        },
      },
    },
  })

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  return result
})
