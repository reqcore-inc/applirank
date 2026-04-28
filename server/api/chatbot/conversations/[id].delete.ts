import { and, eq } from 'drizzle-orm'
import { chatbotConversation } from '../../../database/schema'
import { requireChatbotAccess } from '../../../utils/chatbotAccess'

/**
 * DELETE /api/chatbot/conversations/[id] — cascades to messages.
 */
export default defineEventHandler(async (event) => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id.' })

  const result = await db.delete(chatbotConversation)
    .where(and(
      eq(chatbotConversation.id, id),
      eq(chatbotConversation.organizationId, orgId),
      eq(chatbotConversation.userId, userId),
    ))
    .returning({ id: chatbotConversation.id })

  if (result.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found.' })
  }

  return { success: true }
})
