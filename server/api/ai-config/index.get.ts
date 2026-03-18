import { eq } from 'drizzle-orm'
import { aiConfig } from '../../database/schema'

/**
 * GET /api/ai-config
 * Fetch the organization's AI provider configuration.
 * Returns config WITHOUT the API key (security: never expose encrypted keys).
 * Includes a boolean `hasApiKey` indicating whether a key is configured.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { scoring: ['read'] })
  const orgId = session.session.activeOrganizationId

  const config = await db.query.aiConfig.findFirst({
    where: eq(aiConfig.organizationId, orgId),
    columns: {
      id: true,
      provider: true,
      model: true,
      baseUrl: true,
      maxTokens: true,
      inputPricePer1m: true,
      outputPricePer1m: true,
      apiKeyEncrypted: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!config) return null

  const { apiKeyEncrypted, ...rest } = config
  return { ...rest, hasApiKey: Boolean(apiKeyEncrypted) }
})
