import { eq, sql } from 'drizzle-orm'
import { trackingLink } from '../../../database/schema'

/** Tracking codes are 8-char base64url strings */
const TRACKING_CODE_RE = /^[A-Za-z0-9_-]{1,100}$/

/**
 * GET /api/public/track/:code
 * Public endpoint — no auth required.
 * Increments the click counter on a tracking link and redirects
 * to the appropriate job page (or careers page).
 * Used when sharing direct tracking URLs.
 */
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  if (!code || !TRACKING_CODE_RE.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid tracking code' })
  }

  const link = await db.query.trackingLink.findFirst({
    where: eq(trackingLink.code, code),
    columns: { id: true, jobId: true, isActive: true },
    with: {
      job: { columns: { slug: true } },
    },
  })

  if (!link) {
    throw createError({ statusCode: 404, statusMessage: 'Link not found' })
  }

  // Increment click counter (fire-and-forget, non-blocking)
  if (link.isActive) {
    db.update(trackingLink)
      .set({ clickCount: sql`${trackingLink.clickCount} + 1` })
      .where(eq(trackingLink.id, link.id))
      .then(() => {})
      .catch((err) => {
        logWarn('tracking_link.click_increment_failed', {
          tracking_link_id: link.id,
          error_message: err instanceof Error ? err.message : String(err),
        })
      })
  }

  // Build redirect URL with ref param
  const baseUrl = env.BETTER_AUTH_URL
  if (!baseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Server misconfiguration' })
  }
  const targetPath = link.job?.slug
    ? `/jobs/${link.job.slug}/apply?ref=${encodeURIComponent(code)}`
    : `/jobs?ref=${encodeURIComponent(code)}`

  return sendRedirect(event, `${baseUrl}${targetPath}`, 302)
})
