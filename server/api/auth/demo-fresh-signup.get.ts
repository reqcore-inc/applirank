import { eq } from 'drizzle-orm'
import * as schema from '../../database/schema'

/**
 * Demo-aware signup redirect endpoint.
 *
 * Called via full browser navigation (not $fetch) when a marketing-site
 * visitor clicks "Use Cloud". If the browser carries a demo-org session
 * cookie, the session is destroyed server-side and the auth cookies are
 * expired before redirecting to /auth/sign-up with a clean slate.
 *
 * Using a GET → 302 redirect (instead of $fetch → JSON) guarantees the
 * browser processes Set-Cookie headers during native navigation, which
 * is the only fully reliable way to clear HttpOnly cookies.
 */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session) {
    return sendRedirect(event, '/auth/sign-up')
  }

  const demoSlug = useRuntimeConfig().public.demoOrgSlug as string
  const activeOrgId = (session.session as { activeOrganizationId?: string }).activeOrganizationId

  if (!demoSlug || !activeOrgId) {
    // Real user with an active org — send to dashboard
    return sendRedirect(event, '/dashboard')
  }

  const [org] = await db
    .select({ slug: schema.organization.slug })
    .from(schema.organization)
    .where(eq(schema.organization.id, activeOrgId))
    .limit(1)

  if (org?.slug !== demoSlug) {
    // Real org — send to dashboard
    return sendRedirect(event, '/dashboard')
  }

  // ── Demo session — destroy it server-side ──────────────────────

  // 1. Remove the session row from the database so the token is invalid
  //    even if a cookie somehow survives.
  await db.delete(schema.session).where(eq(schema.session.id, session.session.id))

  // 2. Expire auth cookies. Better Auth prefixes with __Secure- when
  //    baseURL starts with https://. Behind a reverse proxy (Railway,
  //    Cloudflare) the request protocol is http even in production,
  //    so we clear BOTH variants to guarantee removal.
  for (const prefix of ['better-auth', '__Secure-better-auth']) {
    for (const name of ['session_token', 'session_data']) {
      deleteCookie(event, `${prefix}.${name}`, { path: '/' })
    }
  }

  return sendRedirect(event, '/auth/sign-up')
})
