import { eq } from 'drizzle-orm'
import { aiConfig } from '../../database/schema'
import { createAiConfigSchema } from '../../utils/schemas/scoring'
import { encrypt } from '../../utils/encryption'

/**
 * POST /api/ai-config
 * Create or update the organization's AI provider configuration.
 * API key is encrypted at rest using AES-256-GCM before storage.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { scoring: ['create'] })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, createAiConfigSchema.parse)

  const existing = await db.query.aiConfig.findFirst({
    where: eq(aiConfig.organizationId, orgId),
    columns: { id: true, apiKeyEncrypted: true },
  })

  if (existing) {
    const updateData: Record<string, unknown> = {
      provider: body.provider,
      model: body.model,
      baseUrl: body.baseUrl ?? null,
      maxTokens: body.maxTokens,
      inputPricePer1m: body.inputPricePer1m != null ? String(body.inputPricePer1m) : null,
      outputPricePer1m: body.outputPricePer1m != null ? String(body.outputPricePer1m) : null,
      updatedAt: new Date(),
    }

    // Only re-encrypt if a new key was provided
    if (body.apiKey) {
      updateData.apiKeyEncrypted = encrypt(body.apiKey, env.BETTER_AUTH_SECRET)
    }

    const [updated] = await db.update(aiConfig)
      .set(updateData)
      .where(eq(aiConfig.id, existing.id))
      .returning({
        id: aiConfig.id,
        provider: aiConfig.provider,
        model: aiConfig.model,
        baseUrl: aiConfig.baseUrl,
        maxTokens: aiConfig.maxTokens,
      })

    recordActivity({
      organizationId: orgId,
      actorId: session.user.id,
      action: 'updated',
      resourceType: 'aiConfig',
      resourceId: updated!.id,
    })

    return { config: updated }
  }

  // New config requires an API key
  if (!body.apiKey) {
    throw createError({
      statusCode: 422,
      statusMessage: 'API key is required for initial AI configuration.',
    })
  }

  const apiKeyEncrypted = encrypt(body.apiKey, env.BETTER_AUTH_SECRET)

  const [created] = await db.insert(aiConfig)
    .values({
      organizationId: orgId,
      provider: body.provider,
      model: body.model,
      apiKeyEncrypted,
      baseUrl: body.baseUrl ?? null,
      maxTokens: body.maxTokens,
      inputPricePer1m: body.inputPricePer1m != null ? String(body.inputPricePer1m) : null,
      outputPricePer1m: body.outputPricePer1m != null ? String(body.outputPricePer1m) : null,
    })
    .returning({
      id: aiConfig.id,
      provider: aiConfig.provider,
      model: aiConfig.model,
      baseUrl: aiConfig.baseUrl,
      maxTokens: aiConfig.maxTokens,
    })

  recordActivity({
    organizationId: orgId,
    actorId: session.user.id,
    action: 'created',
    resourceType: 'aiConfig',
    resourceId: created!.id,
  })

  setResponseStatus(event, 201)
  return { config: created }
})
