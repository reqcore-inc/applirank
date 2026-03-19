/**
 * Composable for managing PostHog analytics consent (GDPR compliance).
 *
 * By default, PostHog captures events. Users can opt out via this composable.
 * The consent state is persisted in a cookie shared across subdomains
 * (e.g. reqcore.com and app.reqcore.com) via the NUXT_PUBLIC_COOKIE_DOMAIN
 * runtime config.
 *
 * Usage:
 *   const { hasConsented, acceptAnalytics, declineAnalytics } = useAnalyticsConsent()
 */

/** Cookie name — shared across reqcore-web and applirank */
export const CONSENT_COOKIE_NAME = 'reqcore-consent'

/** @deprecated Old localStorage key — used only for one-time migration */
const LEGACY_STORAGE_KEY = 'reqcore-analytics-consent'

type ConsentState = 'granted' | 'denied' | null

export function useAnalyticsConsent() {
  // usePostHog() is auto-imported by @posthog/nuxt, but the module is
  // conditionally loaded.  Replicate the safe accessor so this composable
  // works even when PostHog is not configured (CI, self-hosted without key).
  const posthog = (useNuxtApp() as Record<string, unknown>).$posthog as ((() => { opt_in_capturing: () => void, opt_out_capturing: () => void, capture: (event: string, properties?: Record<string, unknown>) => void }) | undefined)
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

  // One-time migration: move consent from localStorage to cookie for users
  // who consented before this change, then clean up localStorage.
  if (import.meta.client && !consentCookie.value) {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy === 'granted' || legacy === 'denied') {
      consentCookie.value = legacy
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
  }

  const hasConsented = computed(() => consentCookie.value === 'granted')
  const hasDeclined = computed(() => consentCookie.value === 'denied')
  const needsConsent = computed(() => !consentCookie.value)

  function acceptAnalytics() {
    consentCookie.value = 'granted'
    // Also clean up legacy key if it still exists
    if (import.meta.client) localStorage.removeItem(LEGACY_STORAGE_KEY)
    ph?.opt_in_capturing()
    // Capture the entry-page pageview now that the user has opted in.
    // PostHog's init-time $pageview was suppressed by opt_out_capturing_by_default,
    // and subsequent pushState events only fire after this call, so we must
    // manually send one for the page the user is currently on.
    if (import.meta.client) {
      const url = new URL(window.location.href)
      url.search = ''
      url.hash = ''
      ph?.capture('$pageview', { $current_url: url.toString() })
    }
    // Replay any events that were buffered before consent was granted
    // (e.g. signup_submitted, org_created fired during the auth flow).
    if (import.meta.client) {
      flushPendingEvents()
    }
  }

  function declineAnalytics() {
    consentCookie.value = 'denied'
    if (import.meta.client) localStorage.removeItem(LEGACY_STORAGE_KEY)
    ph?.opt_out_capturing()
    // Discard any events buffered before the user declined.
    if (import.meta.client) {
      discardPendingEvents()
    }
  }

  // Apply stored consent on mount.
  // PostHog defaults to opt_out_capturing_by_default: true (GDPR), so we only
  // need to explicitly opt-in for users who previously granted consent.
  if (import.meta.client) {
    if (consentCookie.value === 'granted') {
      ph?.opt_in_capturing()
    }
    else {
      ph?.opt_out_capturing()
    }
  }

  return {
    hasConsented,
    hasDeclined,
    needsConsent,
    acceptAnalytics,
    declineAnalytics,
  }
}
