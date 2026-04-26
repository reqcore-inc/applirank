/**
 * Reverse-proxy: /ingest/** → eu.i.posthog.com/**
 *
 * Proxies PostHog API calls (event capture, decide, feature flags) through
 * our domain to bypass ad-blockers. Uses an explicit server route instead
 * of Nitro routeRules for better error handling and compression compatibility.
 */
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || ''
  const query = getQuery(event)
  const qs = new URLSearchParams(query as Record<string, string>).toString()

  // Static assets (autocapture scripts, web-vitals, etc.) live on the
  // assets host. Everything else (capture, decide, flags) goes to the
  // main ingestion host.
  const host = path.startsWith('static/')
    ? 'https://eu-assets.i.posthog.com'
    : 'https://eu.i.posthog.com'
  const target = `${host}/${path}${qs ? `?${qs}` : ''}`
  const targetHost = new URL(target).host

  // h3's proxyRequest forwards the inbound Host header by default. PostHog's
  // CDN (Cloudflare) rejects requests whose Host header does not match the
  // upstream domain with HTTP 403 + "DNS points to prohibited IP" (Cloudflare
  // error 1000) and an HTML body — which the browser then refuses to execute
  // as JavaScript due to the MIME-type mismatch (X-Content-Type-Options:
  // nosniff). We must rewrite Host (and the related forwarding headers) so
  // the upstream sees a request that looks like it was made directly to it.
  return proxyRequest(event, target, {
    headers: {
      host: targetHost,
      'x-forwarded-host': targetHost,
      'x-forwarded-for': getRequestIP(event) || '',
      'x-forwarded-proto': 'https',
      // Drop cookies — they belong to app.reqcore.com and have no meaning at
      // PostHog. Forwarding them risks leaking session tokens to a third
      // party and bloats the request.
      cookie: '',
    },
  })
})
