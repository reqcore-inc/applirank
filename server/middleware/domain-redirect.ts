/**
 * 301 redirect from the legacy applirank.com domain to reqcore.com.
 *
 * If the old domain's DNS still points to this server (via Cloudflare or Railway),
 * this middleware redirects all traffic to the new domain with a permanent 301,
 * preserving the original path and query string so Google transfers link equity.
 *
 * Also handles non-www → www normalization if ever needed, and ensures HTTPS.
 */
const LEGACY_HOSTS = new Set(['applirank.com', 'www.applirank.com'])
const CANONICAL_ORIGIN = 'https://reqcore.com'

export default defineEventHandler((event) => {
  const host = getRequestHeader(event, 'host')?.split(':')[0]?.toLowerCase()
  if (!host || !LEGACY_HOSTS.has(host)) return

  const url = getRequestURL(event)
  const target = `${CANONICAL_ORIGIN}${url.pathname}${url.search}`

  return sendRedirect(event, target, 301)
})
