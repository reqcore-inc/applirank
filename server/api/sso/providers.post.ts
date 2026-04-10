import { z } from 'zod'

const registerSsoSchema = z.object({
  providerId: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, 'Only lowercase alphanumeric and hyphens'),
  issuer: z.string().url(),
  domain: z.string().min(1).max(253).regex(
    /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    'Must be a valid domain (e.g. company.com)',
  ),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
})

/**
 * POST /api/sso/providers — register an OIDC SSO provider for the current org.
 * Uses Better Auth's SSO plugin under the hood.
 * Only org owners/admins can register providers.
 */
export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId

  // Verify org owner/admin permission
  const { error: permError } = await (auth.api as any).hasPermission({
    headers: event.headers,
    body: { permissions: { organization: ['update'] } },
  })
  if (permError) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: insufficient permissions' })
  }

  const body = await readValidatedBody(event, registerSsoSchema.parse)

  try {
    const result = await (auth.api as any).registerSSOProvider({
      headers: event.headers,
      body: {
        providerId: body.providerId,
        issuer: body.issuer,
        domain: body.domain,
        organizationId: orgId,
        oidcConfig: {
          clientId: body.clientId,
          clientSecret: body.clientSecret,
          scopes: ['openid', 'email', 'profile'],
          pkce: true,
        },
      },
    })

    setResponseStatus(event, 201)
    return {
      id: result.id,
      providerId: result.providerId,
      issuer: result.issuer,
      domain: result.domain,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to register SSO provider'

    // Map Better Auth discovery errors to user-friendly messages
    if (message.includes('discovery_not_found')) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Could not reach the OIDC discovery endpoint. Verify the issuer URL is correct.',
      })
    }
    if (message.includes('discovery_timeout')) {
      throw createError({
        statusCode: 422,
        statusMessage: 'The identity provider did not respond in time. Please try again.',
      })
    }
    if (message.includes('issuer_mismatch')) {
      throw createError({
        statusCode: 422,
        statusMessage: 'The issuer in the discovery document does not match the provided issuer URL.',
      })
    }

    throw createError({ statusCode: 400, statusMessage: message })
  }
})
