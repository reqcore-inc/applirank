import { and, eq } from 'drizzle-orm'
import { chatbotAgent } from '../../../database/schema'
import { requireChatbotAccess } from '../../../utils/chatbotAccess'

/**
 * DELETE /api/chatbot/agents/[id]
 *
 * Delete a custom agent. Conversations referencing the agent are kept;
 * their `agentId` is set to null automatically by the FK.
 */
export default defineEventHandler(async (event) => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id.' })

  const result = await db.delete(chatbotAgent)
    .where(and(
      eq(chatbotAgent.id, id),
      eq(chatbotAgent.organizationId, orgId),
      eq(chatbotAgent.userId, userId),
    ))
    .returning({ id: chatbotAgent.id })

  if (result.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found.' })
  }

  return { success: true }
})
