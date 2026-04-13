import { eq, and } from 'drizzle-orm'
import { candidate } from '../../../../database/schema'

/**
 * GET /api/portal/auth/google
 *
 * Initiates Google OAuth flow for the applicant portal.
 * Redirects the user to Google's consent screen.
 * Reuses the same AUTH_GOOGLE credentials as the recruiter OAuth,
 * but with a portal-specific redirect URI.
 */
export default defineEventHandler(async (event) => {
  const clientId = env.AUTH_GOOGLE_CLIENT_ID
  const clientSecret = env.AUTH_GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Google sign-in is not configured for the applicant portal',
    })
  }

  // Read optional return URL and portal token from query
  const query = getQuery(event)
  const returnTo = typeof query.returnTo === 'string' ? query.returnTo : ''
  const portalToken = typeof query.portalToken === 'string' ? query.portalToken : ''

  // Build state to pass through OAuth flow
  const state = Buffer.from(JSON.stringify({ returnTo, portalToken })).toString('base64url')

  // Derive base URL from the actual request so the redirect_uri always matches
  // the origin the browser is using (handles localhost, Railway, custom domains).
  const baseUrl = getRequestURL(event).origin
  const redirectUri = `${baseUrl}/api/portal/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  })

  return sendRedirect(event, `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})
