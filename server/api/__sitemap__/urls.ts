import { eq } from 'drizzle-orm'
import { job } from '../../database/schema'

/**
 * Dynamic sitemap source — returns URLs for all open public job pages.
 * Used by @nuxtjs/sitemap to include dynamic routes in the XML sitemap.
 *
 * @see https://nuxtseo.com/docs/sitemap/getting-started/data-sources#2-runtime-sources
 */
export default defineEventHandler(async () => {
  const openJobs = await db
    .select({
      slug: job.slug,
      updatedAt: job.updatedAt,
    })
    .from(job)
    .where(eq(job.status, 'open'))

  return openJobs.map((j) => ({
    loc: `/jobs/${j.slug}`,
    lastmod: j.updatedAt,
    changefreq: 'weekly' as const,
    priority: 0.8,
  }))
})
