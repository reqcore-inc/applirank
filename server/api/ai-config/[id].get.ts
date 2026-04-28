import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { aiConfig } from '../../database/schema'

const paramsSchema = z.object({ id: z.string().min(1) })

/**
 * GET /api/ai-config/:id — fetch a single AI configuration (no API key).
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { scoring: ['read'] })
  const orgId = session.session.activeOrganizationId
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const row = await db.query.aiConfig.findFirst({
    where: and(eq(aiConfig.id, id), eq(aiConfig.organizationId, orgId)),
    columns: {
      id: true,
      name: true,
      provider: true,
      model: true,
      baseUrl: true,
      maxTokens: true,
      inputPricePer1m: true,
      outputPricePer1m: true,
      isDefaultChatbot: true,
      isDefaultAnalysis: true,
      apiKeyEncrypted: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })

  const { apiKeyEncrypted, ...rest } = row
  return {
    ...rest,
    inputPricePer1m: rest.inputPricePer1m != null ? Number(rest.inputPricePer1m) : null,
    outputPricePer1m: rest.outputPricePer1m != null ? Number(rest.outputPricePer1m) : null,
    hasApiKey: Boolean(apiKeyEncrypted),
  }
})
