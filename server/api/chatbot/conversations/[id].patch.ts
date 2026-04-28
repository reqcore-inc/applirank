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
  }).optional(),
  thinking: z.boolean().optional(),
  pinned: z.boolean().optional(),
})

/**
 * PATCH /api/chatbot/conversations/[id]
 *
 * Rename, re-file (folder), re-assign agent, change scope, toggle pin.
 */
export default defineEventHandler(async (event): Promise<{ conversation: ChatbotConversationSummary }> => {
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId
  const userId = session.user.id
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id.' })

  const body = await readValidatedBody(event, bodySchema.parse)

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
  if (body.aiConfigId) {
    const c = await db.query.aiConfig.findFirst({
      where: and(eq(aiConfig.id, body.aiConfigId), eq(aiConfig.organizationId, orgId)),
      columns: { id: true },
    })
    if (!c) throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })
  }
  if (body.scope?.kind === 'job') {
    if (!body.scope.jobId) {
      throw createError({ statusCode: 400, statusMessage: 'jobId required for job scope.' })
    }
    const j = await db.query.job.findFirst({
      where: and(eq(job.id, body.scope.jobId), eq(job.organizationId, orgId)),
      columns: { id: true },
    })
    if (!j) throw createError({ statusCode: 404, statusMessage: 'Job not found.' })
  }

  const updates: Partial<typeof chatbotConversation.$inferInsert> = { updatedAt: new Date() }
  if (body.title !== undefined) updates.title = body.title
  if (body.folderId !== undefined) updates.folderId = body.folderId
  if (body.agentId !== undefined) updates.agentId = body.agentId
  if (body.aiConfigId !== undefined) updates.aiConfigId = body.aiConfigId
  if (body.scope !== undefined) updates.scope = body.scope
  if (body.thinking !== undefined) updates.thinking = body.thinking
  if (body.pinned !== undefined) updates.pinned = body.pinned

  const [updated] = await db.update(chatbotConversation)
    .set(updates)
    .where(and(
      eq(chatbotConversation.id, id),
      eq(chatbotConversation.organizationId, orgId),
      eq(chatbotConversation.userId, userId),
    ))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found.' })
  }

  return {
    conversation: {
      id: updated.id,
      title: updated.title,
      folderId: updated.folderId,
      agentId: updated.agentId,
      aiConfigId: updated.aiConfigId,
      scope: (updated.scope ?? { kind: 'organization' }) as ChatbotScope,
      pinned: updated.pinned,
      thinking: updated.thinking,
      lastMessagePreview: updated.lastMessagePreview,
      lastMessageAt: updated.lastMessageAt ? updated.lastMessageAt.getTime() : null,
      createdAt: updated.createdAt.getTime(),
    },
  }
})
