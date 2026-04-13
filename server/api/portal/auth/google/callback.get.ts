/**
 * GET /api/portal/auth/google/callback
 *
 * Google OAuth callback for the applicant portal.
 * Exchanges the authorization code for tokens, fetches the user profile,
 * creates/updates an applicant account, and issues a portal session cookie.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const stateParam = typeof query.state === 'string' ? query.state : ''
  const error = typeof query.error === 'string' ? query.error : ''

  if (error) {
    return sendRedirect(event, '/portal/auth/sign-in?error=oauth_denied')
  }

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing authorization code' })
  }

  // Parse state
  let returnTo = ''
  let portalToken = ''
  try {
    const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    returnTo = state.returnTo || ''
    portalToken = state.portalToken || ''
  } catch {
    // Ignore invalid state
  }

  const clientId = env.AUTH_GOOGLE_CLIENT_ID!
  const clientSecret = env.AUTH_GOOGLE_CLIENT_SECRET!
  // Must match the redirect_uri used in the init endpoint
  const baseUrl = getRequestURL(event).origin
  const redirectUri = `${baseUrl}/api/portal/auth/google/callback`

  // Exchange code for tokens
  const tokenResponse = await $fetch<{
    access_token: string
    id_token?: string
    token_type: string
  }>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    },
  }).catch((err) => {
    logError('portal.google_token_exchange_failed', {
      error_message: err instanceof Error ? err.message : String(err),
    })
    throw createError({ statusCode: 502, statusMessage: 'Failed to authenticate with Google' })
  })

  // Fetch user profile
  const profile = await $fetch<{
    sub: string
    email: string
    name?: string
    picture?: string
    email_verified?: boolean
  }>('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenResponse.access_token}`,
    },
  }).catch((err) => {
    logError('portal.google_profile_fetch_failed', {
      error_message: err instanceof Error ? err.message : String(err),
    })
    throw createError({ statusCode: 502, statusMessage: 'Failed to fetch Google profile' })
  })

  if (!profile.email) {
    throw createError({ statusCode: 400, statusMessage: 'Google account does not have an email address' })
  }

  // Find or create applicant account
  const account = await findOrCreateApplicantAccount({
    googleId: profile.sub,
    email: profile.email,
    name: profile.name,
    image: profile.picture,
  })

  // Create session
  const sessionToken = await createApplicantSession(account.id)

  // Set secure session cookie
  setCookie(event, 'portal_session', sessionToken, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: 72 * 60 * 60, // 72 hours
  })

  // Redirect to portal dashboard or return URL
  const redirectTo = returnTo || '/portal'
  return sendRedirect(event, redirectTo)
})
