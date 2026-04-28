import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { aiConfig, chatbotAgent, chatbotConversation, chatbotFolder, job } from '../../../database/schema'
import { requireChatbotAccess } from '../../../utils/chatbotAccess'
import type { ChatbotConversationSummary, ChatbotScope } from '../../../../shared/chatbot'

const bodySchema = z.object({
  title: z.string().min(1).max(120).trim().optional(),
  folderId: z.string().min(1).nullable().optional(),
  agentId: z.string().min(1).nullable().optional(),
  aiConfigId: z.string().min(1).nullable().optional(),
  scope: z.object({
    kind: z.enum(['organization', 'job']),
    jobId: z.string().min(1).optional(),
  }).default({ kind: 'organization' }),
  thinking: z.boolean().optional(),
})

/**
 * POST /api/chatbot/conversations — start a new conversation.
 */
export default defineEventHandler(async (event): Promise<{ conversation: ChatbotConversationSummary }> => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id

  const body = await readValidatedBody(event, bodySchema.parse)

  // Validate folder ownership.
  if (body.folderId) {
    const f = await db.query.chatbotFolder.findFirst({
      where: and(
        eq(chatbotFolder.id, body.folderId),
        eq(chatbotFolder.organizationId, orgId),
        eq(chatbotFolder.userId, userId),
      ),
      columns: { id: true },
    })
    if (!f) throw createError({ statusCode: 404, statusMessage: 'Folder not found.' })
  }

  // Validate agent ownership.
  if (body.agentId) {
    const a = await db.query.chatbotAgent.findFirst({
      where: and(
        eq(chatbotAgent.id, body.agentId),
        eq(chatbotAgent.organizationId, orgId),
        eq(chatbotAgent.userId, userId),
      ),
      columns: { id: true },
    })
    if (!a) throw createError({ statusCode: 404, statusMessage: 'Agent not found.' })
  }

  // Validate AI config ownership.
  if (body.aiConfigId) {
    const c = await db.query.aiConfig.findFirst({
      where: and(eq(aiConfig.id, body.aiConfigId), eq(aiConfig.organizationId, orgId)),
      columns: { id: true },
    })
    if (!c) throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })
  }

  // Validate job scope.
  if (body.scope.kind === 'job') {
    if (!body.scope.jobId) {
      throw createError({ statusCode: 400, statusMessage: 'jobId required for job scope.' })
    }
    const j = await db.query.job.findFirst({
      where: and(eq(job.id, body.scope.jobId), eq(job.organizationId, orgId)),
      columns: { id: true },
    })
    if (!j) throw createError({ statusCode: 404, statusMessage: 'Job not found.' })
  }

  const [created] = await db.insert(chatbotConversation).values({
    organizationId: orgId,
    userId,
    folderId: body.folderId ?? null,
    agentId: body.agentId ?? null,
    aiConfigId: body.aiConfigId ?? null,
    title: body.title ?? 'New chat',
    scope: body.scope,
    thinking: body.thinking === true,
  }).returning()

  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create conversation.' })
  }

  return {
    conversation: {
      id: created.id,
      title: created.title,
      folderId: created.folderId,
      agentId: created.agentId,
      aiConfigId: created.aiConfigId,
      scope: (created.scope ?? { kind: 'organization' }) as ChatbotScope,
      pinned: created.pinned,
      thinking: created.thinking,
      lastMessagePreview: created.lastMessagePreview,
      lastMessageAt: created.lastMessageAt ? created.lastMessageAt.getTime() : null,
      createdAt: created.createdAt.getTime(),
    },
  }
})
