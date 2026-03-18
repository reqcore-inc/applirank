// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

const railwayEnvironmentName = process.env.RAILWAY_ENVIRONMENT_NAME?.toLowerCase() ?? ''
const railwayPublicDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.toLowerCase() ?? ''
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://reqcore.com'
const i18nDefaultLocale = 'en'
const i18nLocales = [
  { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
  { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json', partial: true },
  { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json', partial: true },
  { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json', partial: true },
  { code: 'nb', language: 'nb-NO', name: 'Norsk Bokmål', file: 'nb.json' },
  { code: 'vi', language: 'vi-VN', name: 'Tiếng Việt', file: 'vi.json', partial: true },
]

const localizedPublicRouteRules = Object.fromEntries(
  i18nLocales
    .filter(locale => locale.code !== i18nDefaultLocale)
    .flatMap(locale => ([
      [`/${locale.code}/jobs`, { isr: 3600 }],
      [`/${locale.code}/jobs/**`, { isr: 3600 }],
    ])),
)

const isRailwayPreview =
  railwayEnvironmentName.startsWith('pr')
  || railwayEnvironmentName.includes('pr-')
  || railwayEnvironmentName.includes('pull request')
  || railwayEnvironmentName.includes('pull-request')
  || railwayEnvironmentName.includes('preview')
  || railwayPublicDomain.includes('-pr-')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/i18n',
    '@nuxtjs/mdc',
    // Only load PostHog module when the API key is available;
    // the SDK crashes during prerender/build if the key is empty.
    ...(process.env.POSTHOG_PUBLIC_KEY ? ['@posthog/nuxt' as const] : []),
  ],

  css: ['~/assets/css/main.css'],

  // ─────────────────────────────────────────────
  // PostHog — privacy-focused product analytics & feature flags
  // ─────────────────────────────────────────────
  posthogConfig: {
    publicKey: process.env.POSTHOG_PUBLIC_KEY || '',
    host: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com',
    clientConfig: {
      // ── Reverse proxy: route PostHog through reqcore.com to bypass ad blockers ──
      // Requests to /ingest/** are proxied by Nitro to eu.i.posthog.com
      api_host: '/ingest',
      ui_host: 'https://eu.posthog.com',
      // ── Privacy: disable invasive features ──
      autocapture: false,
      disable_session_recording: true,
      enable_recording_console_log: false,
      disable_surveys: true,
      opt_out_capturing_by_default: true,
      respect_dnt: true,
      secure_cookie: true,
      capture_pageview: true,
      capture_pageleave: true,
      // ── Persistence ──
      persistence: 'localStorage+cookie',
      cross_subdomain_cookie: false,
    },
  },

  i18n: {
    baseUrl: siteUrl,
    defaultLocale: i18nDefaultLocale,
    strategy: 'prefix_except_default',
    locales: i18nLocales,
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'reqcore_i18n_redirected',
      redirectOn: 'root',
    },
    vueI18n: './i18n.config.ts',
  },

  // ─────────────────────────────────────────────
  // Global <head> — lang, title template, favicon
  // ─────────────────────────────────────────────
  app: {
    head: {
      titleTemplate: '%s — Reqcore',
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'theme-color', content: '#09090b' },
      ],
      // Plausible removed — PostHog handles all analytics
    },
  },

  runtimeConfig: {
    public: {
      /** Base URL of the marketing site (reqcore-web) for cross-domain links */
      marketingUrl: process.env.NUXT_PUBLIC_MARKETING_URL || 'https://reqcore.com',
      // PostHog runtimeConfig is managed by @posthog/nuxt via posthogConfig above.
      // Override at runtime with NUXT_PUBLIC_POSTHOG_PUBLIC_KEY / NUXT_PUBLIC_POSTHOG_HOST.
      /** When set, the dashboard shows a read-only demo banner for this org slug */
      demoOrgSlug: process.env.DEMO_ORG_SLUG || (isRailwayPreview ? 'reqcore-demo' : ''),
      /** Public live-demo account email used to prefill sign-in */
      liveDemoEmail: (() => {
        const email =
          process.env.LIVE_DEMO_EMAIL
          || process.env.DEMO_EMAIL
          || 'demo@reqcore.com'
        // Guard against stale applirank.com domain from old env vars
        if (email.endsWith('@applirank.com')) {
          console.warn('[config] Stale demo email detected (applirank.com domain) — falling back to demo@reqcore.com')
          return 'demo@reqcore.com'
        }
        return email
      })(),
      /** Public live-demo secret used to prefill sign-in */
      liveDemoSecret:
        process.env.LIVE_DEMO_SECRET
        || process.env.DEMO_PASSWORD
        || 'demo1234',
      /** Whether in-app feedback via GitHub Issues is enabled */
      feedbackEnabled: !!(process.env.GITHUB_FEEDBACK_TOKEN && process.env.GITHUB_FEEDBACK_REPO),
    },
  },

  vite: {
    // @ts-expect-error - Vite version mismatch between @tailwindcss/vite and Nuxt's bundled Vite
    plugins: [tailwindcss()],
  },

  // ─────────────────────────────────────────────
  // Route rules — ISR for public job pages
  // ─────────────────────────────────────────────
  routeRules: {
    // ── PostHog reverse proxy — bypasses ad blockers by routing through reqcore.com ──
    // NOTE: Targets are hardcoded to the EU data center (eu.i.posthog.com).
    // If you use the US data center, set POSTHOG_HOST=https://us.i.posthog.com
    // and update these two proxy targets to us-assets.i.posthog.com / us.i.posthog.com.
    '/ingest/static/**': { proxy: 'https://eu-assets.i.posthog.com/static/**' },
    '/ingest/**': { proxy: 'https://eu.i.posthog.com/**' },
    '/jobs': { isr: 3600 },
    '/jobs/**': { isr: 3600 },
    ...localizedPublicRouteRules,
  },

  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'X-XSS-Protection': '1; mode=block',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://eu.i.posthog.com https://eu.posthog.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        },
      },
      // Allow same-origin framing for inline PDF preview in the sidebar iframe
      '/api/documents/*/preview': {
        headers: {
          'X-Frame-Options': 'SAMEORIGIN',
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        },
      },
    },
  },
})
