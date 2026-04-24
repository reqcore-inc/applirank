import { job } from '../../database/schema'
import { createJobSchema } from '../../utils/schemas/job'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { job: ['create'] })
  const orgId = session.session.activeOrganizationId

  const body = await readValidatedBody(event, createJobSchema.parse)

  // Generate a deterministic ID upfront so we can build the slug
  const jobId = crypto.randomUUID()
  const slug = generateJobSlug(body.title, jobId, body.slug)

  const [created] = await db.insert(job).values({
    id: jobId,
    organizationId: orgId,
    title: body.title,
    slug,
    description: body.description,
    location: body.location,
    type: body.type,
    salaryMin: body.salaryMin,
    salaryMax: body.salaryMax,
    salaryCurrency: body.salaryCurrency,
    salaryUnit: body.salaryUnit,
    salaryNegotiable: body.salaryNegotiable,
    remoteStatus: body.remoteStatus,
    validThrough: body.validThrough,
    requireResume: body.requireResume,
    requireCoverLetter: body.requireCoverLetter,
    autoScoreOnApply: body.autoScoreOnApply,
    experienceLevel: body.experienceLevel,
  }).returning({
    id: job.id,
    title: job.title,
    slug: job.slug,
    description: job.description,
    location: job.location,
    type: job.type,
    status: job.status,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryUnit: job.salaryUnit,
    salaryNegotiable: job.salaryNegotiable,
    remoteStatus: job.remoteStatus,
    validThrough: job.validThrough,
    requireResume: job.requireResume,
    requireCoverLetter: job.requireCoverLetter,
    autoScoreOnApply: job.autoScoreOnApply,
    experienceLevel: job.experienceLevel,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  })

  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create job' })
  }

  recordActivity({
    organizationId: orgId,
    actorId: session.user.id,
    action: 'created',
    resourceType: 'job',
    resourceId: created.id,
    metadata: { title: created.title },
  })

  trackEvent(event, session, 'job created', {
    job_id: created.id,
    job_type: created.type,
    has_salary: !!(created.salaryMin || created.salaryMax),
    require_resume: created.requireResume,
    auto_score: created.autoScoreOnApply,
  })

  logApiRequest(event, session, 'job.created', {
    job_id: created.id,
    job_type: created.type,
    has_salary: !!(created.salaryMin || created.salaryMax),
    require_resume: created.requireResume,
    auto_score: created.autoScoreOnApply,
  })

  setResponseStatus(event, 201)
  return created
})
