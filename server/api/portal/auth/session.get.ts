import { eq } from 'drizzle-orm'

/**
 * GET /api/portal/auth/session
 *
 * Returns the current applicant portal session.
 * Used by the client to check authentication status.
 */
export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'portal_session')

  if (!sessionToken) {
    return { authenticated: false, account: null }
  }

  const account = await validateApplicantSession(sessionToken)

  if (!account) {
    // Clear stale cookie
    deleteCookie(event, 'portal_session', { path: '/' })
    return { authenticated: false, account: null }
  }

  return {
    authenticated: true,
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      image: account.image,
    },
  }
})
