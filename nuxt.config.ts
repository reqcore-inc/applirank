// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import { readEnvFlagOverrides } from "./shared/feature-flags";

const railwayEnvironmentName =
  process.env.RAILWAY_ENVIRONMENT_NAME?.toLowerCase() ?? "";
const railwayPublicDomain =
  process.env.RAILWAY_PUBLIC_DOMAIN?.toLowerCase() ?? "";
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || "https://WWMate.com";
const i18nDefaultLocale = "en";
const i18nLocales = [
  { code: "en", language: "en-US", name: "English", file: "en.json" },
  {
    code: "es",
    language: "es-ES",
    name: "EspaÃ±ol",
    file: "es.json",
    partial: true,
  },
  {
    code: "fr",
    language: "fr-FR",
    name: "FranÃ§ais",
    file: "fr.json",
    partial: true,
  },
  {
    code: "de",
    language: "de-DE",
    name: "Deutsch",
    file: "de.json",
    partial: true,
  },
  { code: "nb", language: "nb-NO", name: "Norsk BokmÃ¥l", file: "nb.json" },
  {
    code: "vi",
    language: "vi-VN",
    name: "Tiáº¿ng Viá»‡t",
    file: "vi.json",
    partial: true,
  },
];

const localizedPublicRouteRules = Object.fromEntries(
  i18nLocales
    .filter((locale) => locale.code !== i18nDefaultLocale)
    .flatMap((locale) => [
      [`/${locale.code}/jobs`, { isr: 3600 }],
      [`/${locale.code}/jobs/**`, { isr: 3600 }],
    ]),
);

// Allow search-engine indexing for localized job board pages
const localizedJobsRobotsRules = Object.fromEntries(
  i18nLocales
    .filter((locale) => locale.code !== i18nDefaultLocale)
    .flatMap((locale) => [
      [
        `/${locale.code}/jobs`,
        { headers: { "X-Robots-Tag": "index, follow" } },
      ],
      [
        `/${locale.code}/jobs/**`,
        { headers: { "X-Robots-Tag": "index, follow" } },
      ],
    ]),
);

const isRailwayPreview =
  railwayEnvironmentName.startsWith("pr") ||
  railwayEnvironmentName.includes("pr-") ||
  railwayEnvironmentName.includes("pull request") ||
  railwayEnvironmentName.includes("pull-request") ||
  railwayEnvironmentName.includes("preview") ||
  railwayPublicDomain.includes("-pr-");

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "@nuxtjs/i18n",
    "@nuxtjs/mdc",
    // Only load PostHog module when the API key is available;
    // the SDK crashes during prerender/build if the key is empty.
    ...(process.env.POSTHOG_PUBLIC_KEY ? ["@posthog/nuxt" as const] : []),
  ],

  css: ["~/assets/css/main.css"],

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PostHog â€” privacy-focused product analytics & feature flags
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Enable source maps so PostHog error tracking can display readable stack traces
  sourcemap: { client: "hidden" },

  // @ts-ignore - posthogConfig types only available when @posthog/nuxt module is loaded
  posthogConfig: {
    publicKey: process.env.POSTHOG_PUBLIC_KEY || "",
    host: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
    clientConfig: {
      // â”€â”€ Reverse proxy: route PostHog through WWMate.com to bypass ad blockers â”€â”€
      // Requests to /ingest/** are proxied by Nitro to eu.i.posthog.com
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      // â”€â”€ Privacy: disable invasive features â”€â”€
      autocapture: false,
      disable_session_recording: true,
      enable_recording_console_log: false,
      disable_surveys: true,
      capture_pageview: true,
      capture_pageleave: true,
      // â”€â”€ Error tracking: capture unhandled errors and rejections â”€â”€
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
      // â”€â”€ Cookieless tracking â€” default for visitors who haven't accepted â”€â”€
      // `persistence: 'sessionStorage'` keeps the distinct_id in the tab's
      // sessionStorage only.  Nothing is written to cookies or persistent
      // localStorage, and the id is wiped when the tab closes â€” there is no
      // cross-session tracking and no cross-site identifier (sessionStorage
      // is per-origin, per-tab).
      //
      // We deliberately avoid `persistence: 'memory'` here: with memory
      // persistence every page navigation regenerates the distinct_id,
      // which silently shatters any multi-page funnel (signup â†’ onboarding
      // â†’ dashboard â†’ jobs) for unconsented users â€” every step is attributed
      // to a different anonymous person, so funnel conversion appears as 0.
      //
      // `person_profiles: 'identified_only'` means anonymous visitors flow as
      // events without creating person profiles, while logged-in users get a
      // stable profile keyed by their auth user-id (via posthog.identify()).
      // This gives us reliable funnel + retention analytics for real users
      // without persistently tracking anonymous visitors across sessions.
      persistence: "sessionStorage",
      person_profiles: "identified_only",
      // â”€â”€ GDPR: drop IP address from events â”€â”€
      // PostHog uses $ip server-side for GeoIP, but we do not need it for the
      // SaaS analytics use case.  Denylisting it minimises personal data sent.
      property_denylist: ["$ip", "$initial_ip"],
    },
    serverConfig: {
      // Disabled: the @posthog/nuxt Nitro plugin captures ALL errors
      // (including 404s from bot scanners). We use a filtered error hook
      // in server/plugins/posthog.ts instead.
      enableExceptionAutocapture: false,
    },
  },

  i18n: {
    baseUrl: siteUrl,
    defaultLocale: i18nDefaultLocale,
    strategy: "prefix_except_default",
    locales: i18nLocales,
    langDir: "locales",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "WWMate_i18n_redirected",
      redirectOn: "root",
    },
    vueI18n: "./i18n.config.ts",
  },

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Global <head> â€” lang, title template, favicon
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app: {
    head: {
      titleTemplate: "%s â€” WWMate",
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
      ],
      meta: [
        { name: "theme-color", content: "#09090b" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0, maximum-scale=5.0",
        },
      ],
      // Dark-mode init script is injected in app/app.vue via useHead() with
      // the per-request nonce so it is allowed by the nonce-based CSP.
      // Plausible removed â€” PostHog handles all analytics
    },
  },

  runtimeConfig: {
    public: {
      /** Base URL of the marketing site (WWMate-web) for cross-domain links */
      marketingUrl:
        process.env.NUXT_PUBLIC_MARKETING_URL || "https://WWMate.com",
      /** Cookie domain for cross-subdomain sharing (e.g. '.WWMate.com') */
      cookieDomain: process.env.NUXT_PUBLIC_COOKIE_DOMAIN || "",
      // PostHog runtimeConfig is managed by @posthog/nuxt via posthogConfig above.
      // Override at runtime with NUXT_PUBLIC_POSTHOG_PUBLIC_KEY / NUXT_PUBLIC_POSTHOG_HOST.
      /** When set, the dashboard shows a read-only demo banner for this org slug */
      demoOrgSlug:
        process.env.DEMO_ORG_SLUG || (isRailwayPreview ? "WWMate-demo" : ""),
      /** Public live-demo account email used to prefill sign-in */
      liveDemoEmail: (() => {
        const email =
          process.env.LIVE_DEMO_EMAIL ||
          process.env.DEMO_EMAIL ||
          "demo@WWMate.com";
        // Guard against stale applirank.com domain from old env vars
        if (email.endsWith("@applirank.com")) {
          console.warn(
            "[config] Stale demo email detected (applirank.com domain) â€” falling back to demo@WWMate.com",
          );
          return "demo@WWMate.com";
        }
        return email;
      })(),
      /** Public live-demo passcode used to prefill sign-in */
      liveDemoPasscode:
        process.env.LIVE_DEMO_SECRET || process.env.DEMO_PASSWORD || "demo1234",
      /** Whether in-app feedback via GitHub Issues is enabled */
      feedbackEnabled: !!(
        process.env.GITHUB_FEEDBACK_TOKEN && process.env.GITHUB_FEEDBACK_REPO
      ),
      /** Whether OIDC SSO is enabled (all three OIDC env vars are set) */
      oidcEnabled: !!(
        process.env.OIDC_CLIENT_ID &&
        process.env.OIDC_CLIENT_SECRET &&
        process.env.OIDC_DISCOVERY_URL
      ),
      /** Display name for the SSO provider button */
      oidcProviderName: process.env.OIDC_PROVIDER_NAME || "SSO",
      /**
       * Feature flag overrides forced by env vars (FEATURE_FLAG_*).
       * Self-hosters use these to enable/disable flags without running PostHog.
       * See `shared/feature-flags.ts` for the full registry and resolution order.
       */
      // Cast: Nuxt narrows public runtime config from the registry's literal
      // `defaultValue` types (boolean here), but env overrides can also be
      // multivariate strings â€” and entries are partial. The override map is
      // validated at runtime by `parseFlagOverride`, so the cast is safe.
      featureFlagOverrides: readEnvFlagOverrides() as Record<
        string,
        boolean | string
      >,
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Route rules â€” ISR for public job pages
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  routeRules: {
    // â”€â”€ PostHog reverse proxy â”€â”€
    // Handled by server/routes/ingest/[...path].ts (which routes /ingest/static/**
    // to eu-assets.i.posthog.com and everything else to eu.i.posthog.com).
    // Defining routeRules here would be shadowed by the server route, so we
    // intentionally do not declare them.
    "/jobs": { isr: 3600 },
    "/jobs/**": { isr: 3600 },
    ...localizedPublicRouteRules,
  },

  nitro: {
    routeRules: {
      "/**": {
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
          "Strict-Transport-Security":
            "max-age=63072000; includeSubDomains; preload",
          // Content-Security-Policy is set dynamically with a per-request
          // nonce in server/middleware/csp.ts â€” do NOT add a static CSP here
          // as it would override the nonce and break the XSS protection.
          // Block indexing for all non-public routes by default;
          // overridden below for /jobs/** which should be indexable.
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
      // Public job board pages â€” allow indexing
      "/jobs/**": {
        headers: {
          "X-Robots-Tag": "index, follow",
        },
      },
      "/jobs": {
        headers: {
          "X-Robots-Tag": "index, follow",
        },
      },
      // Localized job board pages â€” allow indexing
      ...localizedJobsRobotsRules,
      // Allow same-origin framing for inline PDF preview in the sidebar iframe
      "/api/documents/*/preview": {
        headers: {
          "X-Frame-Options": "SAMEORIGIN",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'",
        },
      },
    },
  },
});

