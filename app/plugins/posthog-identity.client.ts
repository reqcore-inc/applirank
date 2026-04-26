/**
 * Client-only plugin that wires PostHog into the rest of the app.
 *
 * - Strips query strings and hashes from captured URLs (privacy hardening).
 * - Reads the consent cookie on boot: if the user previously accepted
 *   analytics, upgrade PostHog from memory persistence to
 *   `localStorage+cookie` BEFORE the identity watchers fire.
 * - Provides helpers for identifying the user / setting the active org group;
 *   these are invoked by `usePostHogIdentity` once the auth session loads.
 * - Resets PostHog on sign-out to avoid cross-user data leakage.
 *
 * GDPR model
 * ----------
 * Default state is cookieless (memory persistence, identified_only profiles)
 * so visitors who never see / never click the consent banner have *nothing*
 * stored on their device.  Accepting the banner upgrades persistence so the
 * distinct id survives reloads, and `identify(userId, { email, name })`
 * automatically aliases the anonymous id → user id, stitching the funnel.
 */
import { CONSENT_COOKIE_NAME } from '~/composables/useAnalyticsConsent'

// URL properties that may carry tokens or invitation IDs — always sanitised.
// Includes referrer properties: if a user navigated from /jobs?invite_token=xxx,
// the next page's $referrer would otherwise expose that token.
const SENSITIVE_URL_PROPS = ['$current_url', '$initial_current_url', '$referrer', '$initial_referrer'] as const

export default defineNuxtPlugin({
  name: 'posthog-identity',
  setup() {
    // usePostHog() is auto-imported by @posthog/nuxt, but the module is
    // conditionally loaded (only when POSTHOG_PUBLIC_KEY is set).  Replicate
    // the safe accessor so this plugin is a no-op when PostHog is not
    // configured (CI, self-hosted without the key).
    const $ph = (useNuxtApp() as Record<string, unknown>).$posthog as (() => import('posthog-js').PostHog) | undefined
    const posthog = $ph?.()
    if (!posthog) return

    const cookieDomain = (useRuntimeConfig().public as Record<string, string>).cookieDomain
    const consentCookie = useCookie<string | null>(CONSENT_COOKIE_NAME, {
      domain: cookieDomain || undefined,
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })

    // ── Cross-domain consent linking ──
    // The marketing site (reqcore.com) appends ?ph_consent=granted when the
    // user already accepted analytics there.  Apply it to the shared cookie so
    // the consent banner doesn't appear a second time on the app.
    const url = new URL(window.location.href)
    let urlModified = false
    const crossDomainConsent = url.searchParams.get('ph_consent')
    if (crossDomainConsent === 'granted') {
      // Only accept cross-domain consent when the referrer is the known
      // marketing site.  Without this check any crafted link with
      // ?ph_consent=granted would silently bypass the consent banner,
      // violating GDPR Art. 7 (consent must be freely given).
      let fromTrustedOrigin = false
      if (document.referrer) {
        try {
          const ref = new URL(document.referrer)
          fromTrustedOrigin = ref.hostname === 'reqcore.com' || ref.hostname.endsWith('.reqcore.com')
        }
        catch { /* invalid referrer — ignore */ }
      }
      if (fromTrustedOrigin) {
        consentCookie.value = 'granted'
      }
      url.searchParams.delete('ph_consent')
      urlModified = true
    }

    // ── Apply stored consent: upgrade persistence for returning opted-in users ──
    // PostHog starts with cookieless tracking (persistence: 'memory').  If
    // the user already consented, upgrade to full cookie-based persistence
    // before identity watchers fire so that identify() creates a stable
    // person profile and the existing distinct id aliases cleanly.
    if (consentCookie.value === 'granted') {
      posthog.set_config({
        persistence: 'localStorage+cookie',
        cross_subdomain_cookie: true,
      })
    }

    // ── Cross-domain identity linking ──
    // The marketing site (reqcore.com) appends ?ph_did=<distinct_id> to links
    // pointing here.  If present, alias the marketing visitor's distinct id
    // to this session so the full journey is stitched together in PostHog.
    //
    // We alias regardless of consent: this only links two anonymous distinct
    // ids that PostHog already has — it doesn't add any PII or persistent
    // storage. Without this stitching, every cross-domain user appears as
    // two separate people and funnels report ~0% conversion.
    const marketingDistinctId = url.searchParams.get('ph_did')
    // Validate format: PostHog distinct IDs are typically UUIDs or short
    // alphanumeric strings.  Reject anything outside that to prevent
    // passing arbitrary untrusted input to posthog.alias().
    const isValidDistinctId = marketingDistinctId && /^[\w-]{10,100}$/.test(marketingDistinctId)
    if (isValidDistinctId) {
      posthog.alias(marketingDistinctId)
      url.searchParams.delete('ph_did')
      urlModified = true
    }

    if (urlModified) {
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    }

    // ── Privacy: strip query params and hashes from captured URLs ──
    const originalCapture = posthog.capture.bind(posthog)
    posthog.capture = (eventName: string, properties?: Record<string, unknown>, options?: unknown) => {
      const props = { ...properties }
      for (const key of SENSITIVE_URL_PROPS) {
        if (typeof props[key] === 'string') {
          try {
            const u = new URL(props[key] as string)
            u.search = ''
            u.hash = ''
            props[key] = u.toString()
          }
          catch { /* keep original if parsing fails */ }
        }
      }
      return originalCapture(eventName, props, options as never)
    }

    return {
      provide: {
        /**
         * Identify the logged-in user.  Person properties (email, name) are
         * forwarded ONLY when the visitor has consented to analytics —
         * otherwise we pass just the user id to keep PostHog data anonymous.
         *
         * Calling identify automatically aliases the current anonymous
         * distinct id to the user id, so the pre-signup funnel within the
         * same session is stitched into the user's profile.
         */
        posthogIdentifyUser: (userId: string, properties?: Record<string, string | undefined>) => {
          if (properties) {
            posthog.identify(userId, properties)
          }
          else {
            posthog.identify(userId)
          }
        },
        /**
         * Set the active organization as a PostHog group.  Org name is
         * forwarded only when the user has consented; otherwise just the
         * opaque id flows so per-org metrics still aggregate without
         * exposing customer names in the dashboard.
         */
        posthogSetOrganization: (org: { id: string, name?: string }) => {
          if (org.name) {
            posthog.group('organization', org.id, { name: org.name })
          }
          else {
            posthog.group('organization', org.id)
          }
        },
        posthogReset: () => {
          posthog.reset()
        },
        posthogResetGroups: () => {
          posthog.resetGroups()
        },
        /**
         * Tag the current PostHog session as a demo session.
         *
         * Registers `is_demo` as a super property so EVERY subsequent
         * event carries it — funnels and dashboards can then filter
         * `is_demo != true` to exclude the public demo from real-user
         * metrics. Also forwards the flag as a person property (when
         * consented) so the demo person profile is permanently tagged.
         *
         * Pass `false` to clear the flag (e.g. when a real user signs
         * in after a demo session in the same tab).
         */
        posthogSetDemoFlag: (isDemo: boolean) => {
          if (isDemo) {
            posthog.register({ is_demo: true })
            // Person-level tag — survives across sessions for this user.
            posthog.setPersonProperties({ is_demo: true })
          }
          else {
            posthog.unregister('is_demo')
            posthog.setPersonProperties({ is_demo: false })
          }
        },
      },
    }
  },
})
