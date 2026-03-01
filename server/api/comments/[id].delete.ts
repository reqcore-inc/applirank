import { eq, and } from 'drizzle-orm'
import { comment } from '../../database/schema'
import { commentIdParamSchema } from '../../utils/schemas/comment'

/**
 * DELETE /api/comments/:id
 * Remove a comment.
 * Requires comment:delete permission.
 * Authors can delete their own comments; admin/owner roles
 * already have comment:delete granted so they can remove any.
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { comment: ['delete'] })
  const orgId = session.session.activeOrganizationId

  const { id } = await getValidatedRouterParams(event, commentIdParamSchema.parse)

  // ── Fetch comment & verify org scope ──
  const existing = await db.query.comment.findFirst({
    where: and(
      eq(comment.id, id),
      eq(comment.organizationId, orgId),
    ),
    columns: { id: true, authorId: true, targetType: true, targetId: true },
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  }

  await db.delete(comment).where(eq(comment.id, id))

  // Record activity (fire-and-forget)
  recordActivity({
    organizationId: orgId,
    actorId: session.user.id,
    action: 'deleted',
    resourceType: 'comment',
    resourceId: id,
    metadata: {
      targetType: existing.targetType,
      targetId: existing.targetId,
    },
  })

  setResponseStatus(event, 204)
  return null
})
