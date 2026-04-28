import { and, asc, eq } from 'drizzle-orm'
import { chatbotAgent } from '../../../database/schema'
import { requireChatbotAccess } from '../../../utils/chatbotAccess'
import type { ChatbotAgent } from '../../../../shared/chatbot'

/**
 * GET /api/chatbot/agents
 *
 * List the current user's custom AI agents (private to the caller).
 */
export default defineEventHandler(async (event): Promise<{ agents: ChatbotAgent[] }> => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id

  const rows = await db.query.chatbotAgent.findMany({
    where: and(
      eq(chatbotAgent.organizationId, orgId),
      eq(chatbotAgent.userId, userId),
    ),
    orderBy: [asc(chatbotAgent.createdAt)],
  })

  return {
    agents: rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      icon: r.icon,
      systemPrompt: r.systemPrompt,
      temperature: r.temperature ? Number(r.temperature) : null,
      isDefault: r.isDefault,
      createdAt: r.createdAt.getTime(),
      updatedAt: r.updatedAt.getTime(),
    })),
  }
})
