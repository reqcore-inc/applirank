import { eq, and } from 'drizzle-orm'
import { jobQuestion } from '../../../../database/schema'
import { questionIdParamSchema, updateQuestionSchema } from '../../../../utils/schemas/jobQuestion'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

  const { id: jobId, questionId } = await getValidatedRouterParams(event, questionIdParamSchema.parse)
  const body = await readValidatedBody(event, updateQuestionSchema.parse)

  const [updated] = await db.update(jobQuestion)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(and(
      eq(jobQuestion.id, questionId),
      eq(jobQuestion.jobId, jobId),
      eq(jobQuestion.organizationId, orgId),
    ))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Question not found' })
  }

  return updated
})
