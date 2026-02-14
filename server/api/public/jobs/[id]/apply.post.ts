import { eq, and, asc } from 'drizzle-orm'
import { job, candidate, application, jobQuestion, questionResponse } from '../../../../database/schema'
import { publicApplicationSchema, publicJobIdSchema } from '../../../../utils/schemas/publicApplication'

/**
 * POST /api/public/jobs/:id/apply
 * Public application submission endpoint. No auth required.
 *
 * Flow:
 * 1. Validate the job exists and is open
 * 2. Validate all required custom questions are answered
 * 3. Upsert candidate (deduplicate by email within the org)
 * 4. Create application linking candidate → job
 * 5. Store question responses
 */
export default defineEventHandler(async (event) => {
  const { id: jobId } = await getValidatedRouterParams(event, publicJobIdSchema.parse)
  const body = await readValidatedBody(event, publicApplicationSchema.parse)

  // Honeypot check — if the hidden `website` field is filled, silently reject
  if (body.website) {
    // Return 200 to not tip off bots, but don't create anything
    setResponseStatus(event, 200)
    return { success: true }
  }

  // 1. Fetch the job and verify it's open
  const existingJob = await db.query.job.findFirst({
    where: and(eq(job.id, jobId), eq(job.status, 'open')),
    columns: { id: true, organizationId: true },
  })

  if (!existingJob) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found or not accepting applications' })
  }

  const orgId = existingJob.organizationId

  // 2. Fetch required questions and validate responses
  const questions = await db.query.jobQuestion.findMany({
    where: and(eq(jobQuestion.jobId, jobId), eq(jobQuestion.organizationId, orgId)),
    orderBy: [asc(jobQuestion.displayOrder)],
  })

  const requiredQuestionIds = questions
    .filter((q) => q.required)
    .map((q) => q.id)

  const answeredIds = new Set(body.responses.map((r) => r.questionId))

  const unanswered = requiredQuestionIds.filter((id) => !answeredIds.has(id))

  if (unanswered.length > 0) {
    const unansweredLabels = questions
      .filter((q) => unanswered.includes(q.id))
      .map((q) => q.label)

    throw createError({
      statusCode: 422,
      statusMessage: `Missing required answers: ${unansweredLabels.join(', ')}`,
    })
  }

  // Filter out responses for questions that don't belong to this job
  const validQuestionIds = new Set(questions.map((q) => q.id))
  const validResponses = body.responses.filter((r) => validQuestionIds.has(r.questionId))

  // 3. Upsert candidate — deduplicate by email within this org
  let existingCandidate = await db.query.candidate.findFirst({
    where: and(
      eq(candidate.organizationId, orgId),
      eq(candidate.email, body.email.toLowerCase()),
    ),
    columns: { id: true, firstName: true, lastName: true, phone: true },
  })

  let candidateId: string

  if (existingCandidate) {
    // Only backfill name/phone if the existing values are empty.
    // This prevents a malicious re-application from overwriting recruiter-curated data.
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (!existingCandidate.firstName) updates.firstName = body.firstName
    if (!existingCandidate.lastName) updates.lastName = body.lastName
    if (!existingCandidate.phone && body.phone) updates.phone = body.phone

    const [updated] = await db.update(candidate)
      .set(updates)
      .where(eq(candidate.id, existingCandidate.id))
      .returning({ id: candidate.id })

    candidateId = updated!.id
  } else {
    const [created] = await db.insert(candidate).values({
      organizationId: orgId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email.toLowerCase(),
      phone: body.phone,
    }).returning({ id: candidate.id })

    candidateId = created!.id
  }

  // 4. Create application
  const [newApplication] = await db.insert(application).values({
    organizationId: orgId,
    candidateId,
    jobId,
    status: 'new',
  }).returning({ id: application.id })

  // 5. Store question responses
  if (validResponses.length > 0) {
    await db.insert(questionResponse).values(
      validResponses.map((r) => ({
        organizationId: orgId,
        applicationId: newApplication!.id,
        questionId: r.questionId,
        value: r.value,
      })),
    )
  }

  setResponseStatus(event, 201)
  return { success: true }
})
