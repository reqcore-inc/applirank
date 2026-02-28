import { eq } from 'drizzle-orm'
import * as schema from '../database/schema'
import { createPreviewReadOnlyError } from '../utils/previewReadOnly'
import { isRailwayPreviewEnvironment } from '../utils/env'

/**
 * Demo guard middleware — blocks write operations (POST, PATCH, PUT, DELETE)
 * for the demo organization. Only active when DEMO_ORG_SLUG is set in env.
 *
 * Read operations (GET, HEAD, OPTIONS) pass through unaffected.
 * Auth routes (/api/auth/**) are always allowed so users can sign in/out.
 */

// ─────────────────────────────────────────────
// Cache the demo org ID to avoid a DB lookup on every request.
// We only cache successful resolutions to avoid sticky null-state if
// the org is created after server startup.
// ─────────────────────────────────────────────
const demoOrgIds = new Map<string, string>()
const DEFAULT_PREVIEW_DEMO_ORG_SLUG = 'reqcore-demo'

const PUBLIC_APPLY_PATH_REGEX = /^\/api\/public\/jobs\/([^/]+)\/apply\/?$/

function throwDemoReadOnlyError(): never {
  throw createPreviewReadOnlyError()
}

interface DemoSlugsResult {
  slugs: string[]
  /** True only when DEMO_ORG_SLUG was explicitly set by the operator. */
  isExplicitlyConfigured: boolean
}

function getConfiguredDemoSlugs(): DemoSlugsResult {
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

async function getDemoOrgIds(slugs: string[]): Promise<Set<string>> {
  const ids = new Set<string>()

  for (const slug of slugs) {
    const cached = demoOrgIds.get(slug)
    if (cached) {
      ids.add(cached)
      continue
    }

    const [org] = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.slug, slug))
      .limit(1)

    if (!org?.id) {
      continue
    }

    demoOrgIds.set(slug, org.id)
    ids.add(org.id)
  }

  return ids
}

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Only guard API routes
  if (!path.startsWith('/api/')) return

  // Always allow auth routes (sign-in, sign-out, session, org switch)
  if (path.startsWith('/api/auth/')) return

  const { slugs: demoSlugs, isExplicitlyConfigured } = getConfiguredDemoSlugs()
  if (demoSlugs.length === 0) return

  // Only guard write operations
  if (!WRITE_METHODS.has(event.method)) return

  const guardedOrgIds = await getDemoOrgIds(demoSlugs)
  if (guardedOrgIds.size === 0) {
    // None of the configured demo slugs could be resolved to an org in the DB.
    // This can happen when the demo org hasn't been seeded yet, the slug was
    // misconfigured, or a new deployment hasn't had its demo data created.
    // Pass through silently — there is no demo org to protect, so blocking
    // all writes would break the entire application for every user.
    if (isExplicitlyConfigured) {
      console.warn(
        `[demo-guard] DEMO_ORG_SLUG is set but none of the configured slugs could be resolved: ${demoSlugs.join(', ')}. Demo write-protection is inactive.`,
      )
    }
    return
  }

  // Public apply route has no session context, so resolve org by job slug.
  const publicApplyMatch = path.match(PUBLIC_APPLY_PATH_REGEX)
  if (publicApplyMatch) {
    const slug = decodeURIComponent(publicApplyMatch[1] ?? '')
    if (!slug) return

    const [targetJob] = await db
      .select({ organizationId: schema.job.organizationId })
      .from(schema.job)
      .where(eq(schema.job.slug, slug))
      .limit(1)

    if (targetJob?.organizationId && guardedOrgIds.has(targetJob.organizationId)) {
      throwDemoReadOnlyError()
    }
    return
  }

  // Check if the current session belongs to the demo org
  const session = await auth.api.getSession({ headers: event.headers })
  const activeOrganizationId = session
    ? (session.session as { activeOrganizationId?: string }).activeOrganizationId
    : undefined

  if (!activeOrganizationId) return

  if (guardedOrgIds.has(activeOrganizationId)) {
    throwDemoReadOnlyError()
  }
})
