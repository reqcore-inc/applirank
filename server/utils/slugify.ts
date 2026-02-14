// ─────────────────────────────────────────────
// URL slug generation for public-facing job pages
// ─────────────────────────────────────────────

/**
 * Generates a URL-safe slug from a job title + job ID.
 * Format: `slugified-title-shortid` (e.g. `senior-software-engineer-a1b2c3d4`)
 *
 * The 8-char ID suffix guarantees uniqueness even for identical titles.
 * If a custom slug is provided, it is sanitised and used instead of the title.
 */
export function generateJobSlug(title: string, id: string, customSlug?: string): string {
  const raw = customSlug?.trim() || title
  const base = raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')    // strip non-word chars (except spaces/hyphens)
    .replace(/[\s_]+/g, '-')     // spaces / underscores → hyphens
    .replace(/-+/g, '-')         // collapse multiple hyphens
    .replace(/^-|-$/g, '')       // trim leading/trailing hyphens
    .slice(0, 60)                // cap base length

  const shortId = id.replace(/-/g, '').slice(0, 8)
  return `${base}-${shortId}`
}
