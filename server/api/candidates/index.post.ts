import { eq, and } from 'drizzle-orm'
import { candidate } from '../../database/schema'
import { createCandidateSchema } from '../../utils/schemas/candidate'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { candidate: ['create'] })
  const orgId = session.session.activeOrganizationId

  const body = await readValidatedBody(event, createCandidateSchema.parse)

  // Check for existing candidate with same email in this org
  const existing = await db.query.candidate.findFirst({
    where: and(
      eq(candidate.organizationId, orgId),
      eq(candidate.email, body.email),
    ),
    columns: { id: true },
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A candidate with this email already exists',
    })
  }

  const [created] = await db.insert(candidate).values({
    organizationId: orgId,
    firstName: body.firstName,
    lastName: body.lastName,
    displayName: body.displayName ?? null,
    email: body.email,
    phone: body.phone,
    gender: body.gender ?? null,
    dateOfBirth: body.dateOfBirth ?? null,
  }).returning({
    id: candidate.id,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    displayName: candidate.displayName,
    email: candidate.email,
    phone: candidate.phone,
    gender: candidate.gender,
    dateOfBirth: candidate.dateOfBirth,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  })

  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create candidate' })
  }

  recordActivity({
    organizationId: orgId,
    actorId: session.user.id,
    action: 'created',
    resourceType: 'candidate',
    resourceId: created.id,
    metadata: { name: `${created.firstName} ${created.lastName}` },
  })

  trackEvent(event, session, 'candidate created', {
    candidate_id: created.id,
  })

  logApiRequest(event, session, 'candidate.created', {
    candidate_id: created.id,
  })

  setResponseStatus(event, 201)
  return created
})
