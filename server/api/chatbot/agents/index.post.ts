import { and, count, eq } from 'drizzle-orm'
import { z } from 'zod'
import { chatbotAgent } from '../../../database/schema'
import { requireChatbotAccess } from '../../../utils/chatbotAccess'
import {
  CHATBOT_AGENT_MAX_PER_USER,
  CHATBOT_AGENT_PROMPT_MAX,
  type ChatbotAgent,
} from '../../../../shared/chatbot'

const bodySchema = z.object({
  name: z.string().min(1).max(80).trim(),
  description: z.string().max(280).trim().optional().nullable(),
  icon: z.string().max(40).optional().nullable(),
  systemPrompt: z.string().min(1).max(CHATBOT_AGENT_PROMPT_MAX),
  temperature: z.number().min(0).max(2).optional().nullable(),
  isDefault: z.boolean().optional(),
})

/**
 * POST /api/chatbot/agents
 *
 * Create a custom AI agent (system prompt + persona) for the current user.
 */
export default defineEventHandler(async (event): Promise<{ agent: ChatbotAgent }> => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id

  const body = await readValidatedBody(event, bodySchema.parse)

  // Enforce per-user cap.
  const [{ value: existing } = { value: 0 }] = await db
    .select({ value: count() })
    .from(chatbotAgent)
    .where(and(
      eq(chatbotAgent.organizationId, orgId),
      eq(chatbotAgent.userId, userId),
    ))

  if (existing >= CHATBOT_AGENT_MAX_PER_USER) {
    throw createError({
      statusCode: 422,
      statusMessage: `Agent limit reached (${CHATBOT_AGENT_MAX_PER_USER}). Delete an agent before adding another.`,
    })
  }

  // If marking this agent as default, unset any previous default.
  if (body.isDefault) {
    await db.update(chatbotAgent)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(
        eq(chatbotAgent.organizationId, orgId),
        eq(chatbotAgent.userId, userId),
      ))
  }

  const [created] = await db.insert(chatbotAgent).values({
    organizationId: orgId,
    userId,
    name: body.name,
    description: body.description ?? null,
    icon: body.icon ?? null,
    systemPrompt: body.systemPrompt,
    temperature: typeof body.temperature === 'number' ? String(body.temperature) : null,
    isDefault: body.isDefault === true,
  }).returning()

  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create agent.' })
  }

  return {
    agent: {
      id: created.id,
      name: created.name,
      description: created.description,
      icon: created.icon,
      systemPrompt: created.systemPrompt,
      temperature: created.temperature ? Number(created.temperature) : null,
      isDefault: created.isDefault,
      createdAt: created.createdAt.getTime(),
      updatedAt: created.updatedAt.getTime(),
    },
  }
})
