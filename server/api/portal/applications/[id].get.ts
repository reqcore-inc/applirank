import { eq, and } from 'drizzle-orm'
import { application } from '../../../database/schema'

/**
 * GET /api/portal/applications/:id
 *
 * Returns detailed dashboard data for a specific application.
 * Requires a valid portal session cookie (Google OAuth).
 *
 * Security: Read-only. Session-authenticated. Only returns data
 * for applications belonging to the authenticated email.
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

  const applicationId = getRouterParam(event, 'id')
  if (!applicationId) {
    throw createError({ statusCode: 400, statusMessage: 'Application ID is required' })
  }

  // Find the candidate record matching this email + application
  const app = await db.query.application.findFirst({
    where: eq(application.id, applicationId),
    columns: { id: true, candidateId: true, organizationId: true },
    with: {
      candidate: {
        columns: { email: true },
      },
    },
  })

  if (!app || app.candidate.email.toLowerCase() !== account.email.toLowerCase()) {
    throw createError({ statusCode: 404, statusMessage: 'Application not found' })
  }

  const dashboardData = await getApplicationDashboard(
    app.id,
    app.candidateId,
    app.organizationId,
  )

  if (!dashboardData) {
    throw createError({ statusCode: 404, statusMessage: 'Application not found' })
  }

  return dashboardData
})
