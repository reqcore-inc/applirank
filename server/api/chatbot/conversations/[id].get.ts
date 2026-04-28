import { and, asc, eq } from 'drizzle-orm'
import { chatbotConversation, chatbotMessage } from '../../../database/schema'
import { requireChatbotAccess } from '../../../utils/chatbotAccess'
import type {
  ChatbotAttachment,
  ChatbotConversationDetail,
  ChatbotMessage,
  ChatbotScope,
  ChatbotSource,
  ChatbotToolCall,
} from '../../../../shared/chatbot'

/**
 * GET /api/chatbot/conversations/[id] — load a conversation and its messages.
 */
export default defineEventHandler(async (event): Promise<{ conversation: ChatbotConversationDetail }> => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id.' })

  const conv = await db.query.chatbotConversation.findFirst({
    where: and(
      eq(chatbotConversation.id, id),
      eq(chatbotConversation.organizationId, orgId),
      eq(chatbotConversation.userId, userId),
    ),
  })
  if (!conv) throw createError({ statusCode: 404, statusMessage: 'Conversation not found.' })

  const rows = await db.query.chatbotMessage.findMany({
    where: eq(chatbotMessage.conversationId, conv.id),
    orderBy: [asc(chatbotMessage.createdAt)],
  })

  const messages: ChatbotMessage[] = rows.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    reasoning: m.reasoning ?? undefined,
    toolCalls: (m.toolCalls as ChatbotToolCall[] | null) ?? undefined,
    sources: (m.sources as ChatbotSource[] | null) ?? undefined,
    attachments: (m.attachments as ChatbotAttachment[] | null) ?? undefined,
    createdAt: m.createdAt.getTime(),
  }))

  return {
    conversation: {
      id: conv.id,
      title: conv.title,
      folderId: conv.folderId,
      agentId: conv.agentId,
      aiConfigId: conv.aiConfigId,
      scope: (conv.scope ?? { kind: 'organization' }) as ChatbotScope,
      pinned: conv.pinned,
      thinking: conv.thinking,
      lastMessagePreview: conv.lastMessagePreview,
      lastMessageAt: conv.lastMessageAt ? conv.lastMessageAt.getTime() : null,
      createdAt: conv.createdAt.getTime(),
      messages,
    },
  }
})
