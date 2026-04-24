import { eq, and } from 'drizzle-orm'
import { application, job, candidate, interview, organization, applicantPortalToken } from '../../../database/schema'

/** Rate limit: max 30 requests per IP per minute */
const portalTokenRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many requests. Please try again shortly.',
})

/**
 * GET /api/portal/token/:token
 *
 * Validates a portal access token and returns full application dashboard data.
 * This is the primary endpoint for token-based (no-login) portal access.
 *
 * Returns: job details, application status, timeline, upcoming interviews,
 * organization name, and document list.
 *
 * Security: Read-only. Token is validated and rate-limited.
 */
export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production' && !process.env.CI) {
    await portalTokenRateLimit(event)
  }

  const token = getRouterParam(event, 'token')

  if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid token format' })
  }

  const tokenData = await validatePortalToken(token)

  if (!tokenData) {
    throw createError({ statusCode: 404, statusMessage: 'Invalid or expired access link' })
  }

  const dashboardData = await getApplicationDashboard(
    tokenData.applicationId,
    tokenData.candidateId,
    tokenData.organizationId,
  )

  if (!dashboardData) {
    throw createError({ statusCode: 404, statusMessage: 'Application not found' })
  }

  return dashboardData
})
