import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { ssoProvider } from '~~/server/database/schema'

const deleteSsoSchema = z.object({
  id: z.string().min(1),
})

/**
 * DELETE /api/sso/providers/[id] — remove an SSO provider from the current org.
 * Only org owners/admins can delete providers.
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

  const { id } = await getValidatedRouterParams(event, deleteSsoSchema.parse)

  // Verify the provider belongs to this org before deleting
  const existing = await db
    .select({ id: ssoProvider.id })
    .from(ssoProvider)
    .where(and(eq(ssoProvider.id, id), eq(ssoProvider.organizationId, orgId)))
    .limit(1)

  if (!existing.length) {
    throw createError({ statusCode: 404, statusMessage: 'SSO provider not found' })
  }

  await db
    .delete(ssoProvider)
    .where(and(eq(ssoProvider.id, id), eq(ssoProvider.organizationId, orgId)))

  return { success: true }
})
