/**
 * Composable for managing PostHog analytics consent.
 *
 * Two-tier model
 * --------------
 * - **No choice yet OR declined**: PostHog runs in cookieless mode
 *   (`persistence: 'sessionStorage'`, `person_profiles: 'identified_only'`).
 *   The distinct id lives in the tab's sessionStorage — stable across
 *   navigations within the visit (so funnels work for anonymous users)
 *   but wiped when the tab closes (no cross-session tracking).  Logged-in
 *   users are still identified by their opaque user.id (so we can count
 *   returning users and per-user metrics) but no email/name is forwarded.
 *
 * - **Accepted**: PostHog persistence is upgraded to `localStorage+cookie`
 *   so the distinct id survives reloads, then `identify(userId, { email,
 *   name })` is re-fired with full PII.  PostHog automatically aliases the
 *   current anonymous distinct id → user id, stitching the pre-signup
 *   funnel into the user's profile.
 */

/** Cookie name — shared across reqcore-web and applirank */
export const CONSENT_COOKIE_NAME = 'reqcore-consent'

type ConsentState = 'granted' | 'denied' | null

export function useAnalyticsConsent() {
  // usePostHog() is auto-imported by @posthog/nuxt, but the module is
  // conditionally loaded.  Replicate the safe accessor so this composable
  // works even when PostHog is not configured (CI, self-hosted without key).
  const posthog = (useNuxtApp() as Record<string, unknown>).$posthog as (() => import('posthog-js').PostHog) | undefined
  const ph = posthog?.()

  const cookieDomain = (useRuntimeConfig().public as Record<string, string>).cookieDomain

  // Cross-subdomain cookie: domain=.reqcore.com makes this visible on both
  // reqcore.com (marketing) and app.reqcore.com (app).
  const consentCookie = useCookie<ConsentState>(CONSENT_COOKIE_NAME, {
    domain: cookieDomain || undefined,
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
  })

  const hasConsented = computed(() => consentCookie.value === 'granted')
  const hasDeclined = computed(() => consentCookie.value === 'denied')
  const needsConsent = computed(() => !consentCookie.value)

  function acceptAnalytics() {
    consentCookie.value = 'granted'
    if (!ph) return

    // Upgrade from cookieless to cookie+localStorage persistence so the
    // distinct id survives reloads and new tabs.  After this, the watcher
    // in `usePostHogIdentity` (which depends on `hasConsented`) re-fires
    // and re-identifies the user with full PII — that identify() call
    // automatically aliases the current anonymous distinct id → user id.
    ph.set_config({
      persistence: 'localStorage+cookie',
      cross_subdomain_cookie: true,
    })

    if (import.meta.client) {
      // Capture UTM + first-touch attribution now that we have persistence
      const params = new URLSearchParams(window.location.search)
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
      const utmProps: Record<string, string> = {}
      for (const key of utmKeys) {
        const val = params.get(key)
        if (val) utmProps[key] = val
      }
      if (Object.keys(utmProps).length > 0) {
        ph.register(utmProps)
        const firstTouch: Record<string, string> = {}
        for (const [k, v] of Object.entries(utmProps)) {
          firstTouch[`initial_${k}`] = v
        }
        ph.register_once(firstTouch)
      }
      ph.register_once({
        initial_referrer: document.referrer || '$direct',
        initial_landing_page: window.location.pathname,
      })
      ph.capture('consent_granted')
    }
  }

  function declineAnalytics() {
    consentCookie.value = 'denied'
    // No PostHog action needed — cookieless mode (sessionStorage +
    // identified_only) continues, no cross-session cookies are set.
  }

  return {
    hasConsented,
    hasDeclined,
    needsConsent,
    acceptAnalytics,
    declineAnalytics,
  }
}
