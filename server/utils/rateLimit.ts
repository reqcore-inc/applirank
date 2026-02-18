import type { H3Event } from 'h3'

// ─────────────────────────────────────────────
// In-memory sliding window rate limiter
// ─────────────────────────────────────────────

/**
 * Configuration for a rate limiter instance.
 *
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum number of requests allowed within the window
 * @param message - Error message returned when the limit is exceeded
 */
interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
}

interface RateLimitEntry {
  timestamps: number[]
}

/**
 * Create a reusable rate limiter scoped by client IP.
 *
 * Uses a sliding window algorithm — each request records a timestamp,
 * and only timestamps within the current window are counted.
 *
 * For production at scale, replace with a Redis-backed implementation
 * (e.g. `@upstash/ratelimit`) to handle multi-instance deployments.
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 })
 *
 * export default defineEventHandler(async (event) => {
 *   await limiter(event)
 *   // ... handler logic
 * })
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later' } = config
  const store = new Map<string, RateLimitEntry>()

  // Periodically prune stale entries to prevent unbounded memory growth
  const PRUNE_INTERVAL = Math.max(windowMs * 2, 60_000)
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      // Remove entries with no timestamps within the window
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)
      if (entry.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }, PRUNE_INTERVAL).unref() // .unref() prevents the timer from keeping the process alive

  /**
   * Check and enforce the rate limit for the current request.
   * Throws a 429 error if the limit is exceeded.
   * Sets standard rate limit headers on every response.
   */
  return async function rateLimit(event: H3Event): Promise<void> {
    const ip = getClientIp(event)
    const now = Date.now()

    let entry = store.get(ip)
    if (!entry) {
      entry = { timestamps: [] }
      store.set(ip, entry)
    }

    // Remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)

    // Set rate limit headers (draft RFC 7.2 / common convention)
    const remaining = Math.max(0, maxRequests - entry.timestamps.length)
    const resetSeconds = entry.timestamps.length > 0
      ? Math.ceil((entry.timestamps[0]! + windowMs - now) / 1000)
      : Math.ceil(windowMs / 1000)

    setResponseHeaders(event, {
      'X-RateLimit-Limit': String(maxRequests),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(resetSeconds),
    })

    if (entry.timestamps.length >= maxRequests) {
      setResponseHeader(event, 'Retry-After', resetSeconds)
      throw createError({
        statusCode: 429,
        statusMessage: message,
      })
    }

    // Record this request
    entry.timestamps.push(now)
  }
}

/**
 * Extract the client IP from the request.
 *
 * Security: Does NOT trust proxy headers (X-Forwarded-For, X-Real-IP) by default
 * because they are trivially spoofable by direct clients. Uses the socket remote
 * address which cannot be forged at the application layer.
 *
 * If running behind a trusted reverse proxy (nginx, Cloudflare, etc.), configure
 * the proxy to overwrite (not append to) X-Forwarded-For, then set the
 * TRUSTED_PROXY_IP env var to enable header-based IP extraction.
 */
function getClientIp(event: H3Event): string {
  // Only trust proxy headers when explicitly configured via validated env schema
  const trustedProxy = env.TRUSTED_PROXY_IP
  if (trustedProxy) {
    const socketIp = getRequestIP(event)
    if (socketIp === trustedProxy) {
      // Request came from the trusted proxy — read the forwarded header
      const forwarded = getHeader(event, 'x-forwarded-for')
      if (forwarded) {
        const firstIp = forwarded.split(',')[0]?.trim()
        if (firstIp) return firstIp
      }

      const realIp = getHeader(event, 'x-real-ip')
      if (realIp) return realIp
    }
  }

  // Default: use the socket remote address (cannot be spoofed)
  return getRequestIP(event) ?? '0.0.0.0'
}
