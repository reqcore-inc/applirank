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

  return proxyRequest(event, target, {
    headers: {
      'X-Forwarded-For': getRequestIP(event) || '',
    },
  })
})
