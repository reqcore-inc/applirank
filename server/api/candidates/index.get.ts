import { eq, and, or, ilike, desc, sql, gte, lte } from 'drizzle-orm'
import { candidate, application } from '../../database/schema'
import { candidateQuerySchema } from '../../utils/schemas/candidate'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { candidate: ['read'] })
  const orgId = session.session.activeOrganizationId

  const query = await getValidatedQuery(event, candidateQuerySchema.parse)

  const offset = (query.page - 1) * query.limit
  const conditions = [eq(candidate.organizationId, orgId)]

  if (query.search) {
    // Escape LIKE meta-characters to prevent pattern injection
    const escaped = query.search.replace(/[%_\\]/g, '\\$&')
    const pattern = `%${escaped}%`
    conditions.push(
      or(
        ilike(candidate.firstName, pattern),
        ilike(candidate.lastName, pattern),
        ilike(candidate.email, pattern),
      )!,
    )
  }

  if (query.gender) {
    conditions.push(eq(candidate.gender, query.gender))
  }

  // dateOfBirth is stored as ISO 8601 text (YYYY-MM-DD), so lexicographic comparison works
  if (query.dobFrom) {
    conditions.push(gte(candidate.dateOfBirth, query.dobFrom))
  }
  if (query.dobTo) {
    conditions.push(lte(candidate.dateOfBirth, query.dobTo))
  }

  const where = and(...conditions)

  const [data, total] = await Promise.all([
    db
      .select({
        id: candidate.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        displayName: candidate.displayName,
        email: candidate.email,
        phone: candidate.phone,
        gender: candidate.gender,
        dateOfBirth: candidate.dateOfBirth,
        quickNotes: candidate.quickNotes,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        applicationCount: sql<number>`count(${application.id})::int`,
      })
      .from(candidate)
      .leftJoin(application, eq(application.candidateId, candidate.id))
      .where(where)
      .groupBy(candidate.id)
      .orderBy(desc(candidate.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.$count(candidate, where),
  ])

  return { data, total, page: query.page, limit: query.limit }
})
