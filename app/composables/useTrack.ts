/**
 * Composable for privacy-respecting PostHog funnel tracking.
 *
 * Wraps posthog.capture() with:
 * - Consent gating (no-ops when user hasn't opted in)
 * - Pre-consent event buffering (replayed when user consents)
 * - Auto-enrichment with page context (route path, viewport width)
 */
import type { PostHog } from 'posthog-js'

interface PendingEvent {
  eventName: string
  properties: Record<string, unknown>
}

// Module-level buffer for events captured before consent is granted.
// Flushed to PostHog when the user accepts analytics; discarded on decline.
const MAX_PENDING_EVENTS = 50
const pendingEvents: PendingEvent[] = []

function getPostHog(): PostHog | undefined {
  const $ph = (useNuxtApp() as Record<string, unknown>).$posthog as (() => PostHog) | undefined
  return $ph?.()
}

/**
 * Flush buffered pre-consent events to PostHog.
 * Called by useAnalyticsConsent.acceptAnalytics() after opting in.
 */
export function flushPendingEvents() {
  const ph = getPostHog()
  if (!ph || !ph.has_opted_in_capturing()) return
  while (pendingEvents.length > 0) {
    const event = pendingEvents.shift()!
    ph.capture(event.eventName, event.properties)
  }
}

/**
 * Discard buffered pre-consent events (user declined analytics).
 */
export function discardPendingEvents() {
  pendingEvents.length = 0
}

export function useTrack() {
  const route = useRoute()

  /**
   * Send a custom event to PostHog (consent-gated).
   * Automatically includes current route path and viewport width.
   *
   * If PostHog is not yet opted-in (consent pending), the event is
   * buffered and replayed when/if the user grants consent.
   */
  function track(eventName: string, properties?: Record<string, unknown>) {
    if (!import.meta.client) return
    const ph = getPostHog()
    if (!ph) return

    const enrichedProps = {
      path: route.path,
      viewport_width: window.innerWidth,
      ...properties,
    }

    if (ph.has_opted_in_capturing()) {
      ph.capture(eventName, enrichedProps)
    }
    else if (pendingEvents.length < MAX_PENDING_EVENTS) {
      pendingEvents.push({ eventName, properties: enrichedProps })
    }
  }

  return { track }
}
