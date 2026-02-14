import { eq, and, desc, ilike, or, sql } from 'drizzle-orm'
import { job } from '../../../database/schema'
import { publicJobsQuerySchema } from '../../../utils/schemas/publicApplication'

/**
 * GET /api/public/jobs
 * Lists all open jobs with pagination, search, and type filter.
 * No auth required — this is the public-facing job board endpoint.
 */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, publicJobsQuerySchema.parse)

  const offset = (query.page - 1) * query.limit

  // Always filter to open jobs only
  const conditions = [eq(job.status, 'open')]

  // Optional search — matches title OR location
  if (query.search) {
    const pattern = `%${query.search}%`
    conditions.push(
      or(
        ilike(job.title, pattern),
        ilike(job.location, pattern),
      )!,
    )
  }

  // Optional type filter
  if (query.type) {
    conditions.push(eq(job.type, query.type))
  }

  // Optional location filter
  if (query.location) {
    conditions.push(ilike(job.location, `%${query.location}%`))
  }

  const where = and(...conditions)

  const [data, total] = await Promise.all([
    db.query.job.findMany({
      where,
      limit: query.limit,
      offset,
      orderBy: [desc(job.createdAt)],
      columns: {
        id: true,
        title: true,
        description: true,
        location: true,
        type: true,
        createdAt: true,
      },
    }),
    db.$count(job, where),
  ])

  return { data, total, page: query.page, limit: query.limit }
})
