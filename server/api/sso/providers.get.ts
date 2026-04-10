import { eq } from 'drizzle-orm'
import { ssoProvider } from '~~/server/database/schema'

/**
 * GET /api/sso/providers — list SSO providers for the current organization.
 * Only org owners/admins should access this.
 */
export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId

  // Verify the user has admin/owner role (org update permission)
  const { error } = await (auth.api as any).hasPermission({
    headers: event.headers,
    body: { permissions: { organization: ['update'] } },
  })
  if (error) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: insufficient permissions' })
  }

  const providers = await db
    .select({
      id: ssoProvider.id,
      providerId: ssoProvider.providerId,
      issuer: ssoProvider.issuer,
      domain: ssoProvider.domain,
      organizationId: ssoProvider.organizationId,
    })
    .from(ssoProvider)
    .where(eq(ssoProvider.organizationId, orgId))

  return providers
})
