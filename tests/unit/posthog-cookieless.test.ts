/**
 * Verifies the two-tier PostHog consent + identity model.
 *
 * Default state (no consent / declined):
 *   - persistence: 'memory' (no cookies, no localStorage)
 *   - person_profiles: 'identified_only'
 *   - logged-in users identified by opaque user.id ONLY (no PII)
 *   - org group set with id ONLY
 *   - $ip / $initial_ip denylisted
 *
 * Accepted state:
 *   - persistence upgraded to 'localStorage+cookie'
 *   - identify() re-fired with email + name → aliases anon distinct id
 *   - org group enriched with org name
 *   - UTM + first-touch attribution captured
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8')

describe('PostHog default cookieless config', () => {
  const nuxtConfig = read('nuxt.config.ts')

  it('uses memory-only persistence by default (no storage without consent)', () => {
    expect(nuxtConfig).toMatch(/persistence:\s*["']memory["']/)
  })

  it('creates person profiles only for identified users', () => {
    expect(nuxtConfig).toMatch(/person_profiles:\s*["']identified_only["']/)
  })

  it('denylists IP address properties for GDPR data minimisation', () => {
    expect(nuxtConfig).toMatch(/property_denylist:\s*\[\s*["']\$ip["']\s*,\s*["']\$initial_ip["']\s*\]/)
  })

  it('keeps invasive features disabled', () => {
    expect(nuxtConfig).toMatch(/autocapture:\s*false/)
    expect(nuxtConfig).toMatch(/disable_session_recording:\s*true/)
    expect(nuxtConfig).toMatch(/disable_surveys:\s*true/)
  })
})

describe('Consent surface (banner + composable)', () => {
  it('exposes the consent cookie name shared across subdomains', () => {
    const consent = read('app/composables/useAnalyticsConsent.ts')
    expect(consent).toMatch(/CONSENT_COOKIE_NAME = ['"]reqcore-consent['"]/)
  })

  it('writes the consent cookie with a cross-subdomain domain option', () => {
    const consent = read('app/composables/useAnalyticsConsent.ts')
    expect(consent).toMatch(/domain:\s*cookieDomain/)
    expect(consent).toMatch(/sameSite:\s*['"]lax['"]/)
  })

  it('upgrades persistence to localStorage+cookie on accept', () => {
    const consent = read('app/composables/useAnalyticsConsent.ts')
    expect(consent).toMatch(/set_config\(\s*\{[^}]*persistence:\s*['"]localStorage\+cookie['"]/s)
    expect(consent).toMatch(/cross_subdomain_cookie:\s*true/)
  })

  it('does NOT touch PostHog config on decline (cookieless mode continues)', () => {
    const consent = read('app/composables/useAnalyticsConsent.ts')
    // Isolate the decline function body and assert no upgrade calls inside.
    const match = consent.match(/function declineAnalytics\(\)\s*\{([\s\S]*?)\n\s*\}/)
    expect(match, 'declineAnalytics body found').toBeTruthy()
    const body = match![1]!
    expect(body).not.toMatch(/set_config/)
    expect(body).not.toMatch(/opt_out/)
    expect(body).not.toMatch(/identify/)
  })

  it('captures UTM + first-touch attribution after consent', () => {
    const consent = read('app/composables/useAnalyticsConsent.ts')
    expect(consent).toMatch(/utm_source/)
    expect(consent).toMatch(/initial_referrer/)
    expect(consent).toMatch(/consent_granted/)
  })

  it('renders ConsentBanner only while consent is undecided', () => {
    expect(existsSync(resolve(ROOT, 'app/components/ConsentBanner.vue'))).toBe(true)
    const banner = read('app/components/ConsentBanner.vue')
    expect(banner).toMatch(/v-if="needsConsent"/)
    expect(banner).toMatch(/acceptAnalytics/)
    expect(banner).toMatch(/declineAnalytics/)

    const appVue = read('app/app.vue')
    expect(appVue).toMatch(/<ConsentBanner\s*\/>/)
  })
})

describe('PostHog identity (PII gated on consent)', () => {
  const identityComposable = read('app/composables/usePostHogIdentity.ts')
  const identityPlugin = read('app/plugins/posthog-identity.client.ts')

  it('always identifies logged-in users by opaque user.id (returning-user tracking)', () => {
    expect(identityComposable).toMatch(/identify\(user\.id\)/)
  })

  it('forwards email + name ONLY when consent has been granted', () => {
    expect(identityComposable).toMatch(/if\s*\(\s*consented\s*\)/)
    expect(identityComposable).toMatch(/email:\s*user\.email/)
    expect(identityComposable).toMatch(/name:\s*user\.name/)
  })

  it('plugin identify helper accepts an optional properties bag', () => {
    expect(identityPlugin).toMatch(/posthogIdentifyUser:\s*\(\s*userId:\s*string\s*,\s*properties\?:/)
    // When properties are absent, identify is called with id only (no PII).
    expect(identityPlugin).toMatch(/posthog\.identify\(userId\)/)
    // When properties are present, identify forwards them — this is the call
    // that aliases the anon distinct id to the user id with PII attached.
    expect(identityPlugin).toMatch(/posthog\.identify\(userId,\s*properties\)/)
  })

  it('groups by org id always; org name only when consented', () => {
    expect(identityPlugin).toMatch(/posthog\.group\(\s*['"]organization['"]\s*,\s*org\.id\s*\)/)
    expect(identityPlugin).toMatch(/posthog\.group\(\s*['"]organization['"]\s*,\s*org\.id\s*,\s*\{\s*name:\s*org\.name\s*\}/)
  })

  it('resets PostHog on log-out regardless of consent', () => {
    expect(identityComposable).toMatch(/posthogReset/)
  })

  it('upgrades persistence on boot for already-consented returning visitors', () => {
    expect(identityPlugin).toMatch(/consentCookie\.value === ['"]granted['"]/)
    expect(identityPlugin).toMatch(/persistence:\s*['"]localStorage\+cookie['"]/)
  })
})

describe('PostHog URL-property sanitisation', () => {
  const identityPlugin = read('app/plugins/posthog-identity.client.ts')

  it('strips query strings and hashes from referrer/current_url props', () => {
    expect(identityPlugin).toMatch(/\$current_url/)
    expect(identityPlugin).toMatch(/\$referrer/)
    expect(identityPlugin).toMatch(/u\.search = ''/)
    expect(identityPlugin).toMatch(/u\.hash = ''/)
  })
})

describe('useTrack composable', () => {
  const useTrack = read('app/composables/useTrack.ts')

  it('captures events directly (no consent gating, no opt-in check)', () => {
    expect(useTrack).not.toMatch(/has_opted_in_capturing/)
    expect(useTrack).not.toMatch(/useAnalyticsConsent/)
    expect(useTrack).toMatch(/ph\.capture\(\s*eventName/)
  })
})

describe('Server-side trackEvent (stable distinct id)', () => {
  const trackEvent = read('server/utils/trackEvent.ts')

  it('uses the auth user id as the PostHog distinct id (stable across sessions)', () => {
    expect(trackEvent).toMatch(/distinctId:\s*userId/)
    expect(trackEvent).toMatch(/session\?\.user\?\.id/)
  })

  it('groups events by organization id for per-org analytics', () => {
    expect(trackEvent).toMatch(/groups:\s*orgId\s*\?\s*\{\s*organization:\s*orgId\s*\}/)
  })
})

describe('Cross-domain consent forwarding (marketing → app)', () => {
  const identityPlugin = read('app/plugins/posthog-identity.client.ts')

  it('only honours ?ph_consent=granted from a trusted reqcore.com referrer', () => {
    expect(identityPlugin).toMatch(/ref\.hostname === ['"]reqcore\.com['"]/)
    expect(identityPlugin).toMatch(/ref\.hostname\.endsWith\(['"]\.reqcore\.com['"]/)
  })

  it('only aliases the marketing distinct id when consent is already granted', () => {
    expect(identityPlugin).toMatch(/isValidDistinctId && consentCookie\.value === ['"]granted['"]/)
  })

  it('validates the marketing distinct id format before passing to alias()', () => {
    expect(identityPlugin).toMatch(/\/\^\[\\w-\]\{10,100\}\$\//)
  })
})

describe('Demo account isolation (is_demo super property)', () => {
  // Marketing & internal demo behaviour must never skew real-user funnels.
  // We tag the demo session with `is_demo: true` so dashboards can filter
  // it out — server-side via event property, client-side via super property
  // + person property.

  it('client identity composable references both demo signals (email + slug)', () => {
    const identity = read('app/composables/usePostHogIdentity.ts')
    expect(identity).toMatch(/liveDemoEmail/)
    expect(identity).toMatch(/demoOrgSlug/)
  })

  it('client identity calls the demo flag setter from both watchers', () => {
    const identity = read('app/composables/usePostHogIdentity.ts')
    // user-watcher: tag based on email
    expect(identity).toMatch(/setDemoFlag\(user\.email === liveDemoEmail\)/)
    // org-watcher: tag based on slug
    expect(identity).toMatch(/org\.slug === demoOrgSlug/)
  })

  it('plugin exposes posthogSetDemoFlag as a super-property toggle', () => {
    const plugin = read('app/plugins/posthog-identity.client.ts')
    expect(plugin).toMatch(/posthogSetDemoFlag:/)
    // Super property → automatically attached to every event.
    expect(plugin).toMatch(/posthog\.register\(\s*\{\s*is_demo:\s*true\s*\}/)
    // Cleared on demand so a real user signing in after demo isn't tagged.
    expect(plugin).toMatch(/posthog\.unregister\(['"]is_demo['"]\)/)
    // Person-level tag survives across sessions for the demo profile.
    expect(plugin).toMatch(/setPersonProperties\(\s*\{\s*is_demo:\s*true\s*\}/)
  })

  it('server trackEvent looks up the demo org id and tags every event', () => {
    const trackEvent = read('server/utils/trackEvent.ts')
    expect(trackEvent).toMatch(/from ['"]\.\/demoOrg['"]/)
    expect(trackEvent).toMatch(/isDemoOrgId\(orgId\)/)
    expect(trackEvent).toMatch(/is_demo:\s*isDemo/)
  })

  it('shared demoOrg helper exports the cached demo-org lookup', () => {
    const demoOrg = read('server/utils/demoOrg.ts')
    expect(demoOrg).toMatch(/export async function isDemoOrgId/)
    expect(demoOrg).toMatch(/export async function getDemoOrgIds/)
    expect(demoOrg).toMatch(/export function getConfiguredDemoSlugs/)
  })
})
