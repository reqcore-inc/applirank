import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { chatbotAgent } from '../../../database/schema'
import { requireChatbotAccess } from '../../../utils/chatbotAccess'
import {
  CHATBOT_AGENT_PROMPT_MAX,
  type ChatbotAgent,
} from '../../../../shared/chatbot'

const bodySchema = z.object({
  name: z.string().min(1).max(80).trim().optional(),
  description: z.string().max(280).trim().nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  systemPrompt: z.string().min(1).max(CHATBOT_AGENT_PROMPT_MAX).optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  isDefault: z.boolean().optional(),
})

/**
 * PATCH /api/chatbot/agents/[id]
 *
 * Update a custom AI agent. Caller must own the agent.
 */
export default defineEventHandler(async (event): Promise<{ agent: ChatbotAgent }> => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id.' })

  const body = await readValidatedBody(event, bodySchema.parse)

  const existing = await db.query.chatbotAgent.findFirst({
    where: and(
      eq(chatbotAgent.id, id),
      eq(chatbotAgent.organizationId, orgId),
      eq(chatbotAgent.userId, userId),
    ),
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found.' })
  }

  // If switching this agent to default, clear other defaults first.
  if (body.isDefault === true && !existing.isDefault) {
    await db.update(chatbotAgent)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(
        eq(chatbotAgent.organizationId, orgId),
        eq(chatbotAgent.userId, userId),
      ))
  }

  const updates: Partial<typeof chatbotAgent.$inferInsert> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.icon !== undefined) updates.icon = body.icon
  if (body.systemPrompt !== undefined) updates.systemPrompt = body.systemPrompt
  if (body.temperature !== undefined) {
    updates.temperature = body.temperature === null ? null : String(body.temperature)
  }
  if (body.isDefault !== undefined) updates.isDefault = body.isDefault

  const [updated] = await db.update(chatbotAgent)
    .set(updates)
    .where(and(
      eq(chatbotAgent.id, id),
      eq(chatbotAgent.organizationId, orgId),
      eq(chatbotAgent.userId, userId),
    ))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update agent.' })
  }

  return {
    agent: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      icon: updated.icon,
      systemPrompt: updated.systemPrompt,
      temperature: updated.temperature ? Number(updated.temperature) : null,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt.getTime(),
      updatedAt: updated.updatedAt.getTime(),
    },
  }
})
