import { and, desc, eq } from 'drizzle-orm'
import { chatbotConversation } from '../../../database/schema'
import { requireChatbotAccess } from '../../../utils/chatbotAccess'
import type { ChatbotConversationSummary, ChatbotScope } from '../../../../shared/chatbot'

/**
 * GET /api/chatbot/conversations — list the caller's conversations,
 * pinned first, then most-recent.
 */
export default defineEventHandler(async (event): Promise<{ conversations: ChatbotConversationSummary[] }> => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id

  const rows = await db.query.chatbotConversation.findMany({
    where: and(
      eq(chatbotConversation.organizationId, orgId),
      eq(chatbotConversation.userId, userId),
    ),
    orderBy: [
      desc(chatbotConversation.pinned),
      desc(chatbotConversation.lastMessageAt),
      desc(chatbotConversation.createdAt),
    ],
    limit: 200,
  })

  return {
    conversations: rows.map((r) => ({
      id: r.id,
      title: r.title,
      folderId: r.folderId,
      agentId: r.agentId,
      aiConfigId: r.aiConfigId,
      scope: (r.scope ?? { kind: 'organization' }) as ChatbotScope,
      pinned: r.pinned,
      thinking: r.thinking,
      lastMessagePreview: r.lastMessagePreview,
      lastMessageAt: r.lastMessageAt ? r.lastMessageAt.getTime() : null,
      createdAt: r.createdAt.getTime(),
    })),
  }
})
