/**
 * Demo-aware signup redirect â€” navigated to directly by the browser (GET).
 *
 * Flow:
 *   marketing site "Use Cloud" â†’ GET /api/auth/demo-fresh-signup â†’ this handler
 *
 * Behaviour:
 *   - No session           â†’ redirect to /auth/sign-up
 *   - Demo account session â†’ sign out, then redirect to /auth/sign-up
 *   - Any other account    â†’ redirect to /dashboard (already logged in)
 *
 * Demo detection uses the user email (liveDemoEmail runtime config,
 * defaults to demo@WWMate.com).
 *
 * Sign-out uses Better Auth's server-side API (`auth.api.signOut` with
 * `asResponse: true`) which bypasses CSRF origin checks, deletes the
 * session from the DB, and returns Set-Cookie headers to clear auth
 * cookies. We forward those headers into our 302 redirect.
 */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session) {
    return sendRedirect(event, '/auth/sign-up')
  }

  const demoEmail = (useRuntimeConfig().public.liveDemoEmail as string) || 'demo@WWMate.com'

  if (session.user.email !== demoEmail) {
    return sendRedirect(event, '/dashboard')
  }

  // â”€â”€ Demo session: sign out via Better Auth's server-side API â”€â”€â”€
  const signOutResponse = await (auth.api.signOut as Function)({
    headers: event.headers,
    asResponse: true,
  }) as Response

  // Forward Set-Cookie headers from Better Auth into our redirect
  for (const cookie of signOutResponse.headers.getSetCookie()) {
    appendResponseHeader(event, 'set-cookie', cookie)
  }

  return sendRedirect(event, '/auth/sign-up')
})

