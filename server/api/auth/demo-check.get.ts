/**
 * Server-side check: is the current session a demo account?
 *
 * Used by the fresh-signup page to reliably detect demo sessions
 * before signing out and redirecting to sign-up.
 */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session) {
    return { hasSession: false, isDemo: false }
  }

  const demoEmail = (useRuntimeConfig().public.liveDemoEmail as string) || 'demo@WWMate.com'

  return { hasSession: true, isDemo: session.user.email === demoEmail }
})

