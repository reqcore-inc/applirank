import { job } from '../../database/schema'
import { createJobSchema } from '../../utils/schemas/job'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

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
  }).returning()

  setResponseStatus(event, 201)
  return created
})
