/**
 * GET /api/portal/dashboard
 *
 * Returns all applications for the authenticated applicant.
 * Requires a valid portal session cookie (Google OAuth).
 *
 * Security: Read-only. Session-authenticated.
 */
export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'portal_session')

  if (!sessionToken) {
    throw createError({ statusCode: 401, statusMessage: 'Please sign in to view your applications' })
  }

  const account = await validateApplicantSession(sessionToken)

  if (!account) {
    deleteCookie(event, 'portal_session', { path: '/' })
    throw createError({ statusCode: 401, statusMessage: 'Session expired. Please sign in again.' })
  }

  const applications = await getApplicantDashboardByEmail(account.email)

  return {
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      image: account.image,
    },
    applications,
  }
})
