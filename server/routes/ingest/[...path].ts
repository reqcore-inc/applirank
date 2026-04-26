/**
 * Reverse-proxy: /ingest/** → eu.i.posthog.com/** (and /ingest/static/** →
 * eu-assets.i.posthog.com/**).
 *
 * Proxies PostHog API calls (event capture, decide, feature flags) and the
 * autocapture/web-vitals static assets through our domain to bypass
 * ad-blockers.
 *
 * IMPORTANT — why we do NOT use h3's `proxyRequest` here:
 *
 * app.reqcore.com is behind Cloudflare (in front of Railway). Inbound
 * requests therefore arrive carrying CF-* headers (cf-connecting-ip,
 * cf-ray, cf-ipcountry, cf-visitor) plus an X-Forwarded-For chain that
 * starts with a Cloudflare edge IP. `proxyRequest` forwards ALL inbound
 * headers verbatim, so PostHog's Cloudflare sees a request that looks
 * like it came from another Cloudflare-protected site and rejects it
 * with HTTP 403 + Error 1000 ("DNS points to prohibited IP") and an
 * HTML body. The browser then refuses to execute that HTML as JS due
 * to our X-Content-Type-Options: nosniff header — surfacing as
 * NS_ERROR_CORRUPTED_CONTENT / "MIME type mismatch" in the console.
 *
 * Doing a manual `fetch` with an explicit, minimal allow-list of
 * outbound headers sidesteps the problem entirely: Cloudflare sees a
 * normal direct request and serves the asset.
 */

// Methods that do not carry a request body (per RFC 9110).  fetch() throws
// if you pass a body with these methods.
const BODYLESS_METHODS = new Set(['GET', 'HEAD'])

// Headers we are willing to forward upstream.  Anything not on this list
// (Cookie, Authorization, all CF-*, X-Forwarded-*, X-Real-IP, Host, etc.)
// is dropped so PostHog's CDN does not see anything that looks like a
// proxy/Cloudflare loop.
const FORWARDABLE_REQUEST_HEADERS = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'content-type',
  'content-length',
  'origin',
  'referer',
  'user-agent',
])

// Response headers we strip before relaying back to the browser.  Hop-by-hop
// headers per RFC 7230 §6.1, plus a couple that would conflict with our own
// security headers if they leaked through.
const STRIPPED_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  // Let Nitro handle compression negotiation; passing through an upstream
  // content-encoding alongside a decoded body would corrupt the response.
  'content-encoding',
  'content-length',
])

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || ''
  const query = getQuery(event)
  const qs = new URLSearchParams(query as Record<string, string>).toString()

  // Static assets (autocapture scripts, web-vitals, etc.) live on the
  // assets host. Everything else (capture, decide, flags) goes to the
  // main ingestion host.
  const upstreamOrigin = path.startsWith('static/')
    ? 'https://eu-assets.i.posthog.com'
    : 'https://eu.i.posthog.com'
  const target = `${upstreamOrigin}/${path}${qs ? `?${qs}` : ''}`

  const inboundHeaders = getRequestHeaders(event)
  const outboundHeaders: Record<string, string> = {}
  for (const [name, value] of Object.entries(inboundHeaders)) {
    if (!value) continue
    if (FORWARDABLE_REQUEST_HEADERS.has(name.toLowerCase())) {
      outboundHeaders[name] = Array.isArray(value) ? value.join(', ') : value
    }
  }

  const method = event.method.toUpperCase()
  const body = BODYLESS_METHODS.has(method)
    ? undefined
    : await readRawBody(event, false) // returns Buffer | undefined

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method,
      headers: outboundHeaders,
      body: body as BodyInit | undefined,
      redirect: 'manual',
    })
  } catch (err) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: `PostHog proxy upstream error: ${(err as Error).message}`,
    })
  }

  // Mirror upstream status & safe headers
  setResponseStatus(event, upstream.status, upstream.statusText)
  upstream.headers.forEach((value, name) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(name.toLowerCase())) {
      setResponseHeader(event, name, value)
    }
  })

  // Stream the body back.  Buffer is fine here — PostHog static assets are
  // small (<200 KB) and capture endpoints return tiny JSON payloads.
  const buf = Buffer.from(await upstream.arrayBuffer())
  return buf
})
