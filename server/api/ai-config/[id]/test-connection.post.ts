import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { aiConfig } from '../../../database/schema'
import { generateStructuredOutput, type SupportedProvider } from '../../../utils/ai/provider'
import { createRateLimiter } from '../../../utils/rateLimit'

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  message: 'Too many test connection requests. Please wait before retrying.',
})

const paramsSchema = z.object({ id: z.string().min(1) })
const testSchema = z.object({ ok: z.boolean() })

/**
 * POST /api/ai-config/:id/test-connection
 *
 * Sends a tiny structured prompt to the provider behind this configuration
 * to confirm the key, model and base URL all work end-to-end.
 */
export default defineEventHandler(async (event) => {
  await limiter(event)
  const session = await requirePermission(event, { scoring: ['read'] })
  const orgId = session.session.activeOrganizationId
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const config = await db.query.aiConfig.findFirst({
    where: and(eq(aiConfig.id, id), eq(aiConfig.organizationId, orgId)),
  })
  if (!config) throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })

  try {
    await generateStructuredOutput(
      {
        provider: config.provider as SupportedProvider,
        model: config.model,
        apiKeyEncrypted: config.apiKeyEncrypted,
        baseUrl: config.baseUrl,
        maxTokens: 20,
      },
      {
        system: 'Respond with ok: true',
        prompt: 'Test connection',
        schema: testSchema,
        schemaName: 'TestConnection',
      },
    )
    return { success: true }
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? err?.message ?? 'Unknown error'
    if (typeof message === 'string' && message.includes('decrypt')) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Failed to decrypt API key. If you recently rotated BETTER_AUTH_SECRET, re-enter the API key for this configuration.',
      })
    }
    throw createError({
      statusCode: 422,
      statusMessage: `Connection test failed: ${message}`,
    })
  }
})
