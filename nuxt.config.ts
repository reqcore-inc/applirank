// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/seo', '@nuxt/content'],

  css: ['~/assets/css/main.css'],

  // ─────────────────────────────────────────────
  // Site config — shared across all SEO modules
  // ─────────────────────────────────────────────
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://applirank.com',
    name: 'Applirank',
    description: 'Open-source applicant tracking system with transparent AI, no per-seat pricing, and full data ownership. Self-host on your own infrastructure.',
    defaultLocale: 'en',
  },

  // ─────────────────────────────────────────────
  // Global <head> — lang, title template, favicon
  // ─────────────────────────────────────────────
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      titleTemplate: '%s — Applirank',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      meta: [
        { name: 'theme-color', content: '#09090b' },
      ],
      script: [
        {
          defer: true,
          'data-domain': 'applirank.com',
          src: 'https://test-plausible.kjadfu.easypanel.host/js/script.js',
        },
      ],
    },
  },

  runtimeConfig: {
    public: {
      /** When set, the dashboard shows a read-only demo banner for this org slug */
      demoOrgSlug: process.env.DEMO_ORG_SLUG || '',
      /** Optional one-click demo login email for landing page CTA */
      demoEmail: process.env.NUXT_PUBLIC_DEMO_EMAIL || '',
      /** Optional one-click demo login password for landing page CTA */
      demoPassword: process.env.NUXT_PUBLIC_DEMO_PASSWORD || '',
      /** Whether in-app feedback via GitHub Issues is enabled */
      feedbackEnabled: !!(process.env.GITHUB_FEEDBACK_TOKEN && process.env.GITHUB_FEEDBACK_REPO),
      /** Giscus comments widget configuration */
      giscusRepo: process.env.NUXT_PUBLIC_GISCUS_REPO || '',
      giscusRepoId: process.env.NUXT_PUBLIC_GISCUS_REPO_ID || '',
      giscusCategory: process.env.NUXT_PUBLIC_GISCUS_CATEGORY || '',
      giscusCategoryId: process.env.NUXT_PUBLIC_GISCUS_CATEGORY_ID || '',
      giscusMapping: process.env.NUXT_PUBLIC_GISCUS_MAPPING || 'pathname',
      giscusStrict: process.env.NUXT_PUBLIC_GISCUS_STRICT || '1',
      giscusReactionsEnabled: process.env.NUXT_PUBLIC_GISCUS_REACTIONS_ENABLED || '1',
      giscusEmitMetadata: process.env.NUXT_PUBLIC_GISCUS_EMIT_METADATA || '0',
      giscusInputPosition: process.env.NUXT_PUBLIC_GISCUS_INPUT_POSITION || 'top',
      giscusTheme: process.env.NUXT_PUBLIC_GISCUS_THEME || 'dark',
      giscusLang: process.env.NUXT_PUBLIC_GISCUS_LANG || 'en',
    },
  },

  vite: {
    // @ts-expect-error - Vite version mismatch between @tailwindcss/vite and Nuxt's bundled Vite
    plugins: [tailwindcss()],
  },

  // ─────────────────────────────────────────────
  // Robots — block crawlers from authenticated/API routes
  // ─────────────────────────────────────────────
  robots: {
    disallow: ['/dashboard/', '/auth/', '/api/', '/onboarding/'],
  },

  // ─────────────────────────────────────────────
  // Sitemap — include dynamic public job pages
  // ─────────────────────────────────────────────
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
  },

  // ─────────────────────────────────────────────
  // Schema.org — default organization identity
  // ─────────────────────────────────────────────
  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'Applirank',
      url: 'https://applirank.com',
      logo: 'https://applirank.com/og-image.png',
      sameAs: ['https://github.com/applirank/applirank'],
    },
  },

  // ─────────────────────────────────────────────
  // OG Image — disable automatic generation (we use static images)
  // ─────────────────────────────────────────────
  ogImage: {
    enabled: false,
  },

  // ─────────────────────────────────────────────
  // Route rules — prerender/ISR for public pages
  // ─────────────────────────────────────────────
  routeRules: {
    '/': { prerender: true },
    '/roadmap': { prerender: true },
    '/blog': { prerender: true },
    '/blog/**': { prerender: true },
    '/features': { prerender: true },
    '/features/**': { prerender: true },
    '/jobs': { isr: 3600 },
    '/jobs/**': { isr: 3600 },
  },

  // ─────────────────────────────────────────────
  // Nuxt Content — blog collection
  // ─────────────────────────────────────────────
  content: {
    // content.config.ts handles collection definitions
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
