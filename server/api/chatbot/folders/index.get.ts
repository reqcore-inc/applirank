import { and, asc, eq } from 'drizzle-orm'
import { chatbotFolder } from '../../../database/schema'
import { requireChatbotAccess } from '../../../utils/chatbotAccess'
import type { ChatbotFolder } from '../../../../shared/chatbot'

/**
 * GET /api/chatbot/folders — list the caller's chatbot folders.
 */
export default defineEventHandler(async (event): Promise<{ folders: ChatbotFolder[] }> => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id

  const rows = await db.query.chatbotFolder.findMany({
    where: and(
      eq(chatbotFolder.organizationId, orgId),
      eq(chatbotFolder.userId, userId),
    ),
    orderBy: [asc(chatbotFolder.position), asc(chatbotFolder.createdAt)],
  })

  return {
    folders: rows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      position: r.position,
      createdAt: r.createdAt.getTime(),
    })),
  }
})
