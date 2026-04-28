import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { chatbotFolder } from '../../../database/schema'
import { requireChatbotAccess } from '../../../utils/chatbotAccess'
import type { ChatbotFolder } from '../../../../shared/chatbot'

const bodySchema = z.object({
  name: z.string().min(1).max(80).trim().optional(),
  icon: z.string().max(40).nullable().optional(),
  position: z.number().int().min(0).max(10_000).optional(),
})

/**
 * PATCH /api/chatbot/folders/[id] — rename, re-icon, or reorder a folder.
 */
export default defineEventHandler(async (event): Promise<{ folder: ChatbotFolder }> => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id.' })

  const body = await readValidatedBody(event, bodySchema.parse)

  const updates: Partial<typeof chatbotFolder.$inferInsert> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.icon !== undefined) updates.icon = body.icon
  if (body.position !== undefined) updates.position = body.position

  const [updated] = await db.update(chatbotFolder)
    .set(updates)
    .where(and(
      eq(chatbotFolder.id, id),
      eq(chatbotFolder.organizationId, orgId),
      eq(chatbotFolder.userId, userId),
    ))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Folder not found.' })
  }

  return {
    folder: {
      id: updated.id,
      name: updated.name,
      icon: updated.icon,
      position: updated.position,
      createdAt: updated.createdAt.getTime(),
    },
  }
})
