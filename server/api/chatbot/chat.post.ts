import { and, eq } from 'drizzle-orm'
import { stepCountIs, streamText, type ModelMessage } from 'ai'
import { z } from 'zod'
import {
  chatbotAgent,
  chatbotConversation,
  chatbotMessage,
} from '../../database/schema'
import {
  createLanguageModel,
  type SupportedProvider,
} from '../../utils/ai/provider'
import { loadAiConfig } from '../../utils/ai/loadConfig'
import { buildChatbotTools } from '../../utils/ai/chatTools'
import { getChatbotAttachments } from '../../utils/chatbotAttachments'
import { requireChatbotAccess } from '../../utils/chatbotAccess'
import { extractChatbotSources } from '../../utils/chatbotSources'
import { createRateLimiter } from '../../utils/rateLimit'
import { trackEvent } from '../../utils/trackEvent'
import {
  CHATBOT_MAX_ATTACHMENTS_PER_MESSAGE,
  CHATBOT_MAX_MESSAGES,
  type ChatbotAttachment,
  type ChatbotSource,
  type ChatbotStreamEvent,
  type ChatbotToolCall,
} from '../../../shared/chatbot'

/**
 * POST /api/chatbot/chat
 *
 * Stream a chatbot response and persist both turns to the database.
 *
 * The endpoint receives a `conversationId` (created earlier via
 * /api/chatbot/conversations) plus the latest message list. It:
 *   1. Inserts the user message into chatbot_message.
 *   2. Builds the LLM context from the messages array.
 *   3. Streams the response, accumulating text/reasoning/tool calls/sources.
 *   4. Inserts the assistant message at finish, with full tool-call + source
 *      metadata so it survives a page reload.
 *   5. Updates the conversation's last_message_* columns and (on first turn)
 *      auto-generates a short title from the user's prompt.
 *
 * Wire format: line-delimited JSON over text/event-stream. Each event is
 * shaped like ChatbotStreamEvent (see shared/chatbot.ts).
 */
const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
  message: 'Too many chat requests. Please wait a moment.',
})

const bodySchema = z.object({
  conversationId: z.string().min(1),
  agentId: z.string().min(1).nullable().optional(),
  aiConfigId: z.string().min(1).nullable().optional(),
  scope: z.object({
    kind: z.enum(['organization', 'job']),
    jobId: z.string().min(1).optional(),
  }),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(20_000),
        attachmentIds: z.array(z.string().min(1)).max(CHATBOT_MAX_ATTACHMENTS_PER_MESSAGE).optional(),
      }),
    )
    .min(1)
    .max(CHATBOT_MAX_MESSAGES),
  thinking: z.boolean().optional(),
})

const BASE_SYSTEM_PROMPT = [
  'You are Reqcore Assistant, an AI copilot embedded in an applicant tracking system.',
  'You help recruiters and hiring managers analyse candidates, jobs, and applications.',
  '',
  'Tooling:',
  '- ALWAYS use the provided tools to fetch live data. NEVER invent candidate names, scores, jobs, or numbers.',
  '- Start with list_jobs / list_applications / search_candidates to discover IDs, then drill down with get_* and read_resume.',
  '- When the user uploads files, call list_attachments and read_attachment to inspect them.',
  '- Cite specific applications, candidates, or jobs by name when relevant. Keep IDs out of the prose unless asked.',
  '',
  'Style:',
  '- Be concise, structured, and professional. Prefer markdown lists and tables for comparisons.',
  '- When the user asks for an opinion or recommendation, give one — and back it with evidence from the tools.',
  '- If a question is ambiguous (e.g. "show me top candidates"), make a reasonable assumption and explain it.',
  '- Never expose internal database errors to the user. If a tool fails, retry or explain plainly.',
  '',
  'Privacy & safety:',
  "- All tool data is already scoped to the user's organisation. You cannot, and must not try to, access data outside the active scope.",
  '- Do not produce protected-class inferences or discriminatory recommendations (age, race, gender, religion, disability, national origin).',
].join('\n')

function buildSystemPrompt(scopeLabel: string, agentPrompt: string | null): string {
  const head = `${BASE_SYSTEM_PROMPT}\n\nActive scope: ${scopeLabel}.`
  if (!agentPrompt) return head
  return `${head}\n\n# Custom agent instructions\n${agentPrompt}`
}

function autoTitleFromMessage(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  if (!trimmed) return 'New chat'
  return trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 57)}…`
}

function previewFromContent(content: string): string {
  const t = content.trim().replace(/\s+/g, ' ')
  return t.length <= 200 ? t : `${t.slice(0, 197)}…`
}

export default defineEventHandler(async (event) => {
  await limiter(event)
  const session = await requireChatbotAccess(event)
  const orgId = session.session.activeOrganizationId

  const body = await readValidatedBody(event, bodySchema.parse)

  // ── Load conversation (and verify ownership) ──
  const conversation = await db.query.chatbotConversation.findFirst({
    where: and(
      eq(chatbotConversation.id, body.conversationId),
      eq(chatbotConversation.organizationId, orgId),
      eq(chatbotConversation.userId, session.user.id),
    ),
  })
  if (!conversation) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found.' })
  }

  // ── Load AI config (override → conversation pin → org chatbot default) ──
  const preferredAiConfigId =
    body.aiConfigId !== undefined ? body.aiConfigId : conversation.aiConfigId
  const config = await loadAiConfig(orgId, {
    purpose: 'chatbot',
    preferId: preferredAiConfigId,
  })

  // ── Resolve scope label ──
  let scopeLabel = 'entire organization'
  if (body.scope.kind === 'job') {
    if (!body.scope.jobId) {
      throw createError({ statusCode: 400, statusMessage: 'jobId required for job scope.' })
    }
    const jobRow = await db.query.job.findFirst({
      where: (jobTable, { and: a, eq: e }) => a(
        e(jobTable.organizationId, orgId),
        e(jobTable.id, body.scope.jobId!),
      ),
      columns: { id: true, title: true },
    })
    if (!jobRow) {
      throw createError({ statusCode: 404, statusMessage: 'Job not found.' })
    }
    scopeLabel = `job "${jobRow.title}" (only)`
  }

  // ── Resolve agent (effective agentId = body override → conversation default → none) ──
  const effectiveAgentId =
    body.agentId !== undefined ? body.agentId : conversation.agentId
  let agentPrompt: string | null = null
  let agentTemperature: number | null = null
  if (effectiveAgentId) {
    const agentRow = await db.query.chatbotAgent.findFirst({
      where: and(
        eq(chatbotAgent.id, effectiveAgentId),
        eq(chatbotAgent.organizationId, orgId),
        eq(chatbotAgent.userId, session.user.id),
      ),
    })
    if (!agentRow) {
      throw createError({ statusCode: 404, statusMessage: 'Agent not found.' })
    }
    agentPrompt = agentRow.systemPrompt
    agentTemperature = agentRow.temperature ? Number(agentRow.temperature) : null
  }

  // ── Resolve attachments referenced by the latest user message ──
  const lastUser = [...body.messages].reverse().find((m) => m.role === 'user')
  if (!lastUser) {
    throw createError({ statusCode: 400, statusMessage: 'No user message in request.' })
  }
  const attachmentIds = lastUser.attachmentIds ?? []
  const attachmentRecords = attachmentIds.length
    ? getChatbotAttachments(session.user.id, attachmentIds)
    : []

  if (attachmentIds.length > 0 && attachmentRecords.length === 0) {
    throw createError({
      statusCode: 410,
      statusMessage: 'Attachments expired. Please re-upload your files.',
    })
  }

  const userAttachmentSnapshot: ChatbotAttachment[] = attachmentRecords.map((a) => ({
    id: a.id,
    filename: a.filename,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    textLength: a.textLength,
  }))

  // ── Persist the user message ──
  const [persistedUser] = await db.insert(chatbotMessage).values({
    conversationId: conversation.id,
    organizationId: orgId,
    userId: session.user.id,
    role: 'user',
    content: lastUser.content,
    attachments: userAttachmentSnapshot.length ? userAttachmentSnapshot : null,
  }).returning({ id: chatbotMessage.id, createdAt: chatbotMessage.createdAt })

  // ── Patch conversation metadata. Auto-title on the first user message. ──
  const isFirstMessage = !conversation.lastMessageAt
  let updatedTitle: string | undefined
  const conversationUpdates: Partial<typeof chatbotConversation.$inferInsert> = {
    lastMessagePreview: previewFromContent(lastUser.content),
    lastMessageAt: persistedUser?.createdAt ?? new Date(),
    thinking: body.thinking === true,
    updatedAt: new Date(),
  }
  if (body.agentId !== undefined) conversationUpdates.agentId = body.agentId
  if (body.aiConfigId !== undefined) conversationUpdates.aiConfigId = body.aiConfigId
  if (body.scope) conversationUpdates.scope = body.scope
  if (isFirstMessage && conversation.title === 'New chat') {
    updatedTitle = autoTitleFromMessage(lastUser.content)
    conversationUpdates.title = updatedTitle
  }
  await db.update(chatbotConversation)
    .set(conversationUpdates)
    .where(eq(chatbotConversation.id, conversation.id))

  // ── Build model + tools ──
  const model = createLanguageModel({
    provider: config.provider as SupportedProvider,
    model: config.model,
    apiKeyEncrypted: config.apiKeyEncrypted,
    baseUrl: config.baseUrl,
    maxTokens: Math.max(config.maxTokens, 2048),
  })
  const tools = buildChatbotTools({
    orgId,
    scope: body.scope,
    attachments: attachmentRecords,
  })

  const modelMessages: ModelMessage[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  // ── Set SSE headers ──
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const result = streamText({
    model,
    system: buildSystemPrompt(scopeLabel, agentPrompt),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(8),
    temperature: agentTemperature ?? 0.2,
    ...(body.thinking
      ? { providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens: 4000 } } } }
      : {}),
  })

  const encoder = new TextEncoder()
  const writeEvent = (controller: ReadableStreamDefaultController, e: ChatbotStreamEvent) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`))
  }

  // ── Accumulators for persistence ──
  let assistantContent = ''
  let assistantReasoning = ''
  const toolCallById = new Map<string, ChatbotToolCall>()
  const toolCallOrder: string[] = []
  const seenSourceIds = new Set<string>()
  const sources: ChatbotSource[] = []
  let finishedCleanly = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Notify client of any conversation-level changes before streaming text.
      if (updatedTitle) {
        writeEvent(controller, {
          type: 'conversation-meta',
          conversationId: conversation.id,
          title: updatedTitle,
        })
      }

      try {
        for await (const part of result.fullStream) {
          switch (part.type) {
            case 'text-delta':
              assistantContent += part.text
              writeEvent(controller, { type: 'text-delta', text: part.text })
              break
            case 'reasoning-delta':
              assistantReasoning += part.text
              writeEvent(controller, { type: 'reasoning-delta', text: part.text })
              break
            case 'tool-call': {
              const tc: ChatbotToolCall = {
                id: part.toolCallId,
                name: part.toolName as string,
                input: part.input,
                status: 'pending',
              }
              toolCallById.set(tc.id, tc)
              toolCallOrder.push(tc.id)
              writeEvent(controller, {
                type: 'tool-call',
                id: tc.id,
                name: tc.name,
                input: tc.input,
              })
              break
            }
            case 'tool-result': {
              const existing = toolCallById.get(part.toolCallId)
              if (existing) {
                existing.output = part.output
                existing.status = 'success'

                // Extract sources from the structured output.
                for (const src of extractChatbotSources(existing.name, part.output)) {
                  if (seenSourceIds.has(src.id)) continue
                  seenSourceIds.add(src.id)
                  sources.push(src)
                  writeEvent(controller, { type: 'source', source: src })
                }
              }
              writeEvent(controller, {
                type: 'tool-result',
                id: part.toolCallId,
                output: part.output,
              })
              break
            }
            case 'tool-error': {
              const existing = toolCallById.get(part.toolCallId)
              const errMsg = part.error instanceof Error ? part.error.message : String(part.error)
              if (existing) {
                existing.output = { error: errMsg }
                existing.status = 'error'
              }
              writeEvent(controller, {
                type: 'tool-error',
                id: part.toolCallId,
                error: errMsg,
              })
              break
            }
            case 'error':
              writeEvent(controller, {
                type: 'error',
                error: part.error instanceof Error ? part.error.message : String(part.error),
              })
              break
            case 'finish': {
              finishedCleanly = true
              writeEvent(controller, {
                type: 'finish',
                usage: {
                  promptTokens: part.totalUsage.inputTokens ?? 0,
                  completionTokens: part.totalUsage.outputTokens ?? 0,
                },
              })
              break
            }
            default:
              // Ignore start/start-step/finish-step/text-start/etc. — they don't
              // contribute to the visible message and would just bloat the wire.
              break
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown streaming error'
        // Surface to caller AND server log so failures don't go unnoticed.
        console.error('[chatbot] stream failed', err)
        writeEvent(controller, {
          type: 'error',
          error: errMsg,
        })
      } finally {
        // Persist whatever we got, even on partial failure — so the user can
        // reload the page and still see the partial answer.
        try {
          const orderedToolCalls = toolCallOrder
            .map((id) => toolCallById.get(id))
            .filter((tc): tc is ChatbotToolCall => tc !== undefined)

          const finalContent = assistantContent
            || (finishedCleanly ? '' : '⚠️ The assistant did not return a response.')

          const [persistedAssistant] = await db.insert(chatbotMessage).values({
            conversationId: conversation.id,
            organizationId: orgId,
            userId: session.user.id,
            role: 'assistant',
            content: finalContent,
            reasoning: assistantReasoning ? assistantReasoning : null,
            toolCalls: orderedToolCalls.length ? orderedToolCalls : null,
            sources: sources.length ? sources : null,
          }).returning({ createdAt: chatbotMessage.createdAt })

          if (finalContent) {
            await db.update(chatbotConversation)
              .set({
                lastMessagePreview: previewFromContent(finalContent),
                lastMessageAt: persistedAssistant?.createdAt ?? new Date(),
                updatedAt: new Date(),
              })
              .where(eq(chatbotConversation.id, conversation.id))
          }
        } catch (persistErr) {
          // Persistence failures must not crash the stream — log loudly.
          console.error('[chatbot] failed to persist assistant message', persistErr)
        }
        controller.close()
      }
    },
  })

  // Fire-and-forget analytics — never block the stream.
  trackEvent(event, session, 'chatbot_message_sent', {
    scope: body.scope.kind,
    has_attachments: attachmentRecords.length > 0,
    message_count: body.messages.length,
    thinking: body.thinking === true,
    has_agent: !!effectiveAgentId,
    conversation_id: conversation.id,
  })

  return sendStream(event, stream)
})
