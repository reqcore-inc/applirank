import { activityLog } from '../database/schema'

type ActivityAction = typeof activityLog.$inferInsert.action

/**
 * Record an activity in the immutable audit log.
 *
 * This is a fire-and-forget helper — it never throws to avoid
 * disrupting the primary operation.  Failures are logged to stderr
 * so they surface in monitoring without breaking user flows.
 */
export async function recordActivity(params: {
  organizationId: string
  actorId: string
  action: ActivityAction
  resourceType: string
  resourceId: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await db.insert(activityLog).values({
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata ?? null,
    })
  }
  catch (err) {
    // Activity logging must never break the primary operation.
    logWarn('activity.record_failed', {
      org_id: params.organizationId,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      error_message: err instanceof Error ? err.message : String(err),
    })
  }
}
