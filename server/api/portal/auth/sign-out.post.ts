import { eq } from 'drizzle-orm'
import { applicantSession } from '../../../database/schema'

/**
 * POST /api/portal/auth/sign-out
 *
 * Signs the applicant out by deleting their session.
 */
export default defineEventHandler(async (event) => {
  const sessionToken = getCookie(event, 'portal_session')

  if (sessionToken) {
    await db.delete(applicantSession)
      .where(eq(applicantSession.token, sessionToken))
      .catch(() => {})

    deleteCookie(event, 'portal_session', { path: '/' })
  }

  return { success: true }
})
