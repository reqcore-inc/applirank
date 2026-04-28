import { and, count, eq, max } from 'drizzle-orm'
import { z } from 'zod'
import { chatbotFolder } from '../../../database/schema'
import { requireChatbotAccess } from '../../../utils/chatbotAccess'
import {
  CHATBOT_FOLDER_MAX_PER_USER,
  type ChatbotFolder,
} from '../../../../shared/chatbot'

const bodySchema = z.object({
  name: z.string().min(1).max(80).trim(),
  icon: z.string().max(40).optional().nullable(),
})

/**
 * POST /api/chatbot/folders — create a new folder.
 */
export default defineEventHandler(async (event): Promise<{ folder: ChatbotFolder }> => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id

  const body = await readValidatedBody(event, bodySchema.parse)

  const [{ value: existing } = { value: 0 }] = await db
    .select({ value: count() })
    .from(chatbotFolder)
    .where(and(
      eq(chatbotFolder.organizationId, orgId),
      eq(chatbotFolder.userId, userId),
    ))

  if (existing >= CHATBOT_FOLDER_MAX_PER_USER) {
    throw createError({
      statusCode: 422,
      statusMessage: `Folder limit reached (${CHATBOT_FOLDER_MAX_PER_USER}).`,
    })
  }

  const [{ value: maxPos } = { value: null }] = await db
    .select({ value: max(chatbotFolder.position) })
    .from(chatbotFolder)
    .where(and(
      eq(chatbotFolder.organizationId, orgId),
      eq(chatbotFolder.userId, userId),
    ))

  const [created] = await db.insert(chatbotFolder).values({
    organizationId: orgId,
    userId,
    name: body.name,
    icon: body.icon ?? null,
    position: (maxPos ?? -1) + 1,
  }).returning()

  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create folder.' })
  }

  return {
    folder: {
      id: created.id,
      name: created.name,
      icon: created.icon,
      position: created.position,
      createdAt: created.createdAt.getTime(),
    },
  }
})
