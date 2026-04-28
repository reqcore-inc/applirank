import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { aiConfig } from '../../../database/schema'
import { setAiConfigDefaultSchema } from '../../../utils/schemas/scoring'

const paramsSchema = z.object({ id: z.string().min(1) })

/**
 * POST /api/ai-config/:id/set-default
 *
 * Atomically claims one or more "default" slots (chatbot, analysis) for this
 * configuration. Clears the same flag on every other config in the org so
 * exactly one default exists per purpose.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { scoring: ['create'] })
  const orgId = session.session.activeOrganizationId
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, setAiConfigDefaultSchema.parse)

  const existing = await db.query.aiConfig.findFirst({
    where: and(eq(aiConfig.id, id), eq(aiConfig.organizationId, orgId)),
    columns: { id: true },
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })

  await db.transaction(async (tx) => {
    if (body.purposes.includes('chatbot')) {
      await tx.update(aiConfig)
        .set({ isDefaultChatbot: false })
        .where(eq(aiConfig.organizationId, orgId))
    }
    if (body.purposes.includes('analysis')) {
      await tx.update(aiConfig)
        .set({ isDefaultAnalysis: false })
        .where(eq(aiConfig.organizationId, orgId))
    }

    const promote: Record<string, unknown> = { updatedAt: new Date() }
    if (body.purposes.includes('chatbot')) promote.isDefaultChatbot = true
    if (body.purposes.includes('analysis')) promote.isDefaultAnalysis = true

    await tx.update(aiConfig)
      .set(promote)
      .where(and(eq(aiConfig.id, id), eq(aiConfig.organizationId, orgId)))
  })

  recordActivity({
    organizationId: orgId,
    actorId: session.user.id,
    action: 'updated',
    resourceType: 'aiConfig',
    resourceId: id,
    metadata: { setDefault: body.purposes },
  })

  return { success: true }
})
