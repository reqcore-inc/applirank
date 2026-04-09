import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { aiConfig } from '../../database/schema'
import type { SupportedProvider } from '../../utils/ai/provider'
import { generateStructuredOutput } from '../../utils/ai/provider'
import { createRateLimiter } from '../../utils/rateLimit'

const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5, message: 'Too many test connection requests. Please wait before retrying.' })

const testSchema = z.object({
  ok: z.boolean(),
})

/**
 * POST /api/ai-config/test-connection
 * Test the AI provider connection by sending a minimal prompt.
 * Returns { success: true } if the provider responds, or an error message.
 */
export default defineEventHandler(async (event) => {
  await limiter(event)
  const session = await requirePermission(event, { scoring: ['read'] })
  const orgId = session.session.activeOrganizationId

  const config = await db.query.aiConfig.findFirst({
    where: eq(aiConfig.organizationId, orgId),
  })

  if (!config) {
    throw createError({
      statusCode: 422,
      statusMessage: 'AI provider not configured. Set up your AI provider in Settings → AI first.',
    })
  }

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

    // If it's our own decryption error, give a more helpful message
    if (message.includes('decrypt')) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Failed to decrypt API key. If you recently changed BETTER_AUTH_SECRET, you need to re-enter your API key.',
      })
    }

    throw createError({
      statusCode: 422,
      statusMessage: `Connection test failed: ${message}`,
    })
  }
})
