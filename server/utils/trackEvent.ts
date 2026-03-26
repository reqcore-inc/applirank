import type { H3Event } from 'h3'

interface TrackSession {
  user: { id: string }
  session: { activeOrganizationId: string }
}

/**
 * Fire-and-forget server-side PostHog event capture.
 *
 * Automatically enriches events with:
 * - `distinctId` from the authenticated session
 * - `organization` group for org-scoped analytics
 * - Request context: HTTP method, path, user agent
 *
 * Usage in API handlers:
 *   const session = await requirePermission(event, { application: ['update'] })
 *   trackEvent(event, session, 'application status_changed', { from: 'new', to: 'screening' })
 */
export function trackEvent(
  event: H3Event,
  session: TrackSession | null,
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  try {
    const ph = useServerPostHog()
    if (!ph) return

    const userId = session?.user?.id || 'anonymous'
    const orgId = session?.session?.activeOrganizationId

    const headers = getHeaders(event)
    const method = getMethod(event)
    const path = getRequestURL(event).pathname

    ph.capture({
      distinctId: userId,
      event: eventName,
      groups: orgId ? { organization: orgId } : undefined,
      properties: {
        // Request context — invaluable for debugging per-user issues
        $request_method: method,
        $request_path: path,
        $user_agent: headers['user-agent'],
        ...properties,
      },
    })
  }
  catch {
    // Tracking must never break the primary operation
  }
}

/**
 * Track an API error event to PostHog (for the API tracking middleware).
 * Unlike trackEvent, this doesn't require a session — uses anonymous tracking.
 */
export function trackApiError(
  event: H3Event,
  statusCode: number,
  properties?: Record<string, unknown>,
): void {
  try {
    const ph = useServerPostHog()
    if (!ph) return

    const headers = getHeaders(event)
    const method = getMethod(event)
    const path = getRequestURL(event).pathname

    // Use the PostHog anonymous distinct ID from the cookie if available,
    // otherwise use a request-scoped identifier.
    const distinctId = getCookie(event, 'ph_reqcore_posthog') || 'server-anonymous'

    ph.capture({
      distinctId,
      event: 'api error',
      properties: {
        status_code: statusCode,
        error_category: statusCode >= 500 ? 'server' : 'client',
        $request_method: method,
        $request_path: path,
        $user_agent: headers['user-agent'],
        ...properties,
      },
    })
  }
  catch {
    // Tracking must never break the primary operation
  }
}

/**
 * Capture a server-side exception to PostHog error tracking.
 *
 * Uses captureException() (not capture('$exception')) per PostHog docs
 * to ensure correct stack trace processing and source map integration.
 */
export function trackServerError(
  event: H3Event,
  session: TrackSession | null,
  error: unknown,
  properties?: Record<string, unknown>,
): void {
  try {
    const ph = useServerPostHog()
    if (!ph) return

    const userId = session?.user?.id || 'anonymous'
    const headers = getHeaders(event)
    const method = getMethod(event)
    const path = getRequestURL(event).pathname

    ph.captureException(
      error instanceof Error ? error : new Error(String(error)),
      userId,
      {
        $request_method: method,
        $request_path: path,
        $user_agent: headers['user-agent'],
        ...properties,
      },
    )
  }
  catch {
    // Tracking must never break the primary operation
  }
}
