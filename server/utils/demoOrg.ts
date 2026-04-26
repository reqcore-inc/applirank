/**
 * Shared helpers for detecting the demo organization across the server.
 *
 * Used by:
 * - `server/middleware/demo-guard.ts` to block writes on the demo org
 * - `server/utils/trackEvent.ts` to tag PostHog events with `is_demo: true`
 *   so the demo session can be filtered out of funnels and dashboards.
 *
 * Demo-org IDs are cached after the first DB lookup. We never cache a
 * negative result so that orgs created after server boot are picked up
 * on the next request.
 */
import { eq } from 'drizzle-orm'
import * as schema from '../database/schema'
import { isRailwayPreviewEnvironment } from './env'

const demoOrgIdBySlug = new Map<string, string>()
const demoOrgIdSet = new Set<string>()
const DEFAULT_PREVIEW_DEMO_ORG_SLUG = 'reqcore-demo'

export interface DemoSlugsResult {
  slugs: string[]
  /** True only when DEMO_ORG_SLUG was explicitly set by the operator. */
  isExplicitlyConfigured: boolean
}

export function getConfiguredDemoSlugs(): DemoSlugsResult {
  const slugs = new Set<string>()
  let isExplicitlyConfigured = false

  if (env.DEMO_ORG_SLUG) {
    slugs.add(env.DEMO_ORG_SLUG)
    isExplicitlyConfigured = true
  }

  if (isRailwayPreviewEnvironment(env.RAILWAY_ENVIRONMENT_NAME)) {
    slugs.add(DEFAULT_PREVIEW_DEMO_ORG_SLUG)
  }

  return { slugs: [...slugs], isExplicitlyConfigured }
}

/**
 * Resolve the configured demo slugs to organisation IDs.
 *
 * Falls back to a synchronous cache lookup when possible to avoid an
 * extra DB hit on every authenticated request. The first request after
 * boot still pays the lookup cost.
 */
export async function getDemoOrgIds(slugs?: string[]): Promise<Set<string>> {
  const slugList = slugs ?? getConfiguredDemoSlugs().slugs
  const ids = new Set<string>()

  for (const slug of slugList) {
    const cached = demoOrgIdBySlug.get(slug)
    if (cached) {
      ids.add(cached)
      continue
    }

    const [org] = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.slug, slug))
      .limit(1)

    if (!org?.id) continue

    demoOrgIdBySlug.set(slug, org.id)
    demoOrgIdSet.add(org.id)
    ids.add(org.id)
  }

  return ids
}

/**
 * True when the given organisation id matches a configured demo org.
 *
 * Returns false (not null) when no demo org is configured or the org
 * cannot be resolved — callers can safely treat the result as a boolean
 * funnel filter.
 */
export async function isDemoOrgId(orgId: string | null | undefined): Promise<boolean> {
  if (!orgId) return false
  const ids = await getDemoOrgIds()
  return ids.has(orgId)
}
