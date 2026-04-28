/**
 * useChatbot — client-side state machine for the AI chatbot.
 *
 * Manages persisted state via the chatbot REST API:
 *   - Conversations (sidebar list, current open conversation, full message history).
 *   - Folders (sidebar grouping).
 *   - Custom agents (system-prompt personas, picked from the composer).
 *   - Pending file attachments queued for the next user message.
 *   - Streaming connection lifecycle for the active turn.
 *   - Sources cited by the assistant during the active turn.
 *
 * State is shared across the page via `useState` so the sidebar and the main
 * pane stay in sync. Errors are surfaced via the global toast composable so
 * that streaming failures, persistence failures and HTTP errors never go
 * unnoticed — every catch block routes through `reportError`.
 */
import type {
  ChatbotAgent,
  ChatbotAttachment,
  ChatbotConversationDetail,
  ChatbotConversationSummary,
  ChatbotFolder,
  ChatbotMessage,
  ChatbotScope,
  ChatbotSource,
  ChatbotStreamEvent,
  ChatbotToolCall,
} from '~~/shared/chatbot'

/** Lightweight summary of an AI configuration as exposed by GET /api/ai-config. */
export interface ChatbotAiConfigSummary {
  id: string
  name: string
  provider: string
  model: string
  isDefaultChatbot: boolean
  isDefaultAnalysis: boolean
  hasApiKey: boolean
}

interface FetchErrorLike {
  data?: { statusMessage?: string; message?: string }
  message?: string
  statusCode?: number
}

function describeError(err: unknown, fallback: string): string {
  const e = err as FetchErrorLike
  return e?.data?.statusMessage || e?.data?.message || e?.message || fallback
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export function useChatbot() {
  const toast = useToast()

  // ── Shared reactive state ──
  const conversations = useState<ChatbotConversationSummary[]>('chatbot.conversations', () => [])
  const folders = useState<ChatbotFolder[]>('chatbot.folders', () => [])
  const agents = useState<ChatbotAgent[]>('chatbot.agents', () => [])

  const currentConversationId = useState<string | null>('chatbot.currentConversationId', () => null)
  const messages = useState<ChatbotMessage[]>('chatbot.messages', () => [])
  const sources = useState<ChatbotSource[]>('chatbot.sources', () => [])

  const pendingAttachments = useState<ChatbotAttachment[]>('chatbot.pendingAttachments', () => [])
  const scope = useState<ChatbotScope>('chatbot.scope', () => ({ kind: 'organization' }))
  const thinking = useState<boolean>('chatbot.thinking', () => false)
  const selectedAgentId = useState<string | null>('chatbot.selectedAgentId', () => null)

  const isStreaming = useState<boolean>('chatbot.isStreaming', () => false)
  const error = useState<string | null>('chatbot.error', () => null)
  const loadingConversation = useState<boolean>('chatbot.loadingConversation', () => false)

  // AI configurations the user can switch between mid-conversation. `null` =
  // "use the org's chatbot default" (resolved server-side).
  const aiConfigs = useState<ChatbotAiConfigSummary[]>('chatbot.aiConfigs', () => [])
  const selectedAiConfigId = useState<string | null>('chatbot.selectedAiConfigId', () => null)

  // Local — not shared across composable instances.
  let abortController: AbortController | null = null

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────
  function reportError(err: unknown, title: string) {
    const message = describeError(err, 'Something went wrong.')
    error.value = message
    console.error(`[chatbot] ${title}`, err)
    toast.error(title, { message })
  }

  const currentConversation = computed<ChatbotConversationSummary | null>(() => {
    if (!currentConversationId.value) return null
    return conversations.value.find((c) => c.id === currentConversationId.value) ?? null
  })

  const defaultAgent = computed<ChatbotAgent | null>(() =>
    agents.value.find((a) => a.isDefault) ?? null,
  )

  // ──────────────────────────────────────────────────────────────────────────
  // Folder / agent / conversation loaders
  // ──────────────────────────────────────────────────────────────────────────
  async function loadAll() {
    try {
      const [convRes, folderRes, agentRes, configRes] = await Promise.all([
        $fetch<{ conversations: ChatbotConversationSummary[] }>('/api/chatbot/conversations'),
        $fetch<{ folders: ChatbotFolder[] }>('/api/chatbot/folders'),
        $fetch<{ agents: ChatbotAgent[] }>('/api/chatbot/agents'),
        $fetch<ChatbotAiConfigSummary[]>('/api/ai-config').catch(() => [] as ChatbotAiConfigSummary[]),
      ])
      conversations.value = convRes.conversations
      folders.value = folderRes.folders
      agents.value = agentRes.agents
      aiConfigs.value = Array.isArray(configRes) ? configRes : []
      if (selectedAgentId.value === null && defaultAgent.value) {
        selectedAgentId.value = defaultAgent.value.id
      }
    } catch (err) {
      reportError(err, 'Failed to load chat data')
    }
  }

  async function refreshAiConfigs() {
    try {
      const res = await $fetch<ChatbotAiConfigSummary[]>('/api/ai-config')
      aiConfigs.value = Array.isArray(res) ? res : []
    } catch (err) {
      reportError(err, 'Failed to refresh AI configurations')
    }
  }

  async function refreshConversations() {
    try {
      const res = await $fetch<{ conversations: ChatbotConversationSummary[] }>('/api/chatbot/conversations')
      conversations.value = res.conversations
    } catch (err) {
      reportError(err, 'Failed to refresh conversations')
    }
  }

  async function refreshAgents() {
    try {
      const res = await $fetch<{ agents: ChatbotAgent[] }>('/api/chatbot/agents')
      agents.value = res.agents
    } catch (err) {
      reportError(err, 'Failed to refresh agents')
    }
  }

  async function refreshFolders() {
    try {
      const res = await $fetch<{ folders: ChatbotFolder[] }>('/api/chatbot/folders')
      folders.value = res.folders
    } catch (err) {
      reportError(err, 'Failed to refresh folders')
    }
  }

  async function openConversation(id: string) {
    if (currentConversationId.value === id) return
    currentConversationId.value = id
    messages.value = []
    sources.value = []
    pendingAttachments.value = []
    error.value = null
    loadingConversation.value = true
    try {
      const res = await $fetch<{ conversation: ChatbotConversationDetail }>(`/api/chatbot/conversations/${id}`)
      messages.value = res.conversation.messages
      scope.value = res.conversation.scope
      thinking.value = res.conversation.thinking
      selectedAgentId.value = res.conversation.agentId
      // Conversations remember which AI config they were last using; surface it
      // in the picker so the user sees the right model on reopen.
      const convAiConfigId = (res.conversation as { aiConfigId?: string | null }).aiConfigId ?? null
      selectedAiConfigId.value = convAiConfigId
      // Aggregate sources across the conversation history.
      const all: ChatbotSource[] = []
      const seen = new Set<string>()
      for (const m of res.conversation.messages) {
        for (const s of m.sources ?? []) {
          if (seen.has(s.id)) continue
          seen.add(s.id)
          all.push(s)
        }
      }
      sources.value = all
    } catch (err) {
      reportError(err, 'Failed to open conversation')
      currentConversationId.value = null
    } finally {
      loadingConversation.value = false
    }
  }

  async function newConversation(opts: {
    folderId?: string | null
    agentId?: string | null
    aiConfigId?: string | null
    scope?: ChatbotScope
  } = {}) {
    try {
      const res = await $fetch<{ conversation: ChatbotConversationSummary }>('/api/chatbot/conversations', {
        method: 'POST',
        body: {
          folderId: opts.folderId ?? null,
          agentId: opts.agentId ?? selectedAgentId.value ?? defaultAgent.value?.id ?? null,
          aiConfigId: opts.aiConfigId ?? selectedAiConfigId.value ?? null,
          scope: opts.scope ?? scope.value,
          thinking: thinking.value,
        },
      })
      conversations.value = [res.conversation, ...conversations.value]
      currentConversationId.value = res.conversation.id
      messages.value = []
      sources.value = []
      pendingAttachments.value = []
      error.value = null
      scope.value = res.conversation.scope
      selectedAgentId.value = res.conversation.agentId
      selectedAiConfigId.value = (res.conversation as { aiConfigId?: string | null }).aiConfigId ?? null
      return res.conversation
    } catch (err) {
      reportError(err, 'Failed to create conversation')
      return null
    }
  }

  async function updateConversation(
    id: string,
    patch: Partial<Pick<ChatbotConversationSummary, 'title' | 'folderId' | 'agentId' | 'scope' | 'pinned' | 'thinking'>> & { aiConfigId?: string | null },
  ) {
    try {
      const res = await $fetch<{ conversation: ChatbotConversationSummary }>(`/api/chatbot/conversations/${id}`, {
        method: 'PATCH',
        body: patch,
      })
      conversations.value = conversations.value.map((c) => c.id === id ? res.conversation : c)
      return res.conversation
    } catch (err) {
      reportError(err, 'Failed to update conversation')
      return null
    }
  }

  async function deleteConversation(id: string) {
    try {
      await $fetch(`/api/chatbot/conversations/${id}`, { method: 'DELETE' })
      conversations.value = conversations.value.filter((c) => c.id !== id)
      if (currentConversationId.value === id) {
        currentConversationId.value = null
        messages.value = []
        sources.value = []
      }
    } catch (err) {
      reportError(err, 'Failed to delete conversation')
    }
  }

  // ── Folders ──
  async function createFolder(name: string, icon?: string | null) {
    try {
      const res = await $fetch<{ folder: ChatbotFolder }>('/api/chatbot/folders', {
        method: 'POST',
        body: { name, icon: icon ?? null },
      })
      folders.value = [...folders.value, res.folder].sort((a, b) => a.position - b.position)
      return res.folder
    } catch (err) {
      reportError(err, 'Failed to create folder')
      return null
    }
  }

  async function renameFolder(id: string, name: string) {
    try {
      const res = await $fetch<{ folder: ChatbotFolder }>(`/api/chatbot/folders/${id}`, {
        method: 'PATCH',
        body: { name },
      })
      folders.value = folders.value.map((f) => f.id === id ? res.folder : f)
    } catch (err) {
      reportError(err, 'Failed to rename folder')
    }
  }

  async function deleteFolder(id: string) {
    try {
      await $fetch(`/api/chatbot/folders/${id}`, { method: 'DELETE' })
      folders.value = folders.value.filter((f) => f.id !== id)
      // Conversations previously in this folder become "uncategorised" server-side via FK SET NULL.
      conversations.value = conversations.value.map((c) =>
        c.folderId === id ? { ...c, folderId: null } : c,
      )
    } catch (err) {
      reportError(err, 'Failed to delete folder')
    }
  }

  // ── Agents ──
  async function createAgent(input: {
    name: string
    description?: string | null
    icon?: string | null
    systemPrompt: string
    temperature?: number | null
    isDefault?: boolean
  }) {
    try {
      const res = await $fetch<{ agent: ChatbotAgent }>('/api/chatbot/agents', {
        method: 'POST',
        body: input,
      })
      // Reload list — if isDefault flipped, other agents need refresh too.
      await refreshAgents()
      return res.agent
    } catch (err) {
      reportError(err, 'Failed to create agent')
      return null
    }
  }

  async function updateAgent(id: string, patch: Partial<{
    name: string
    description: string | null
    icon: string | null
    systemPrompt: string
    temperature: number | null
    isDefault: boolean
  }>) {
    try {
      await $fetch(`/api/chatbot/agents/${id}`, { method: 'PATCH', body: patch })
      await refreshAgents()
    } catch (err) {
      reportError(err, 'Failed to update agent')
    }
  }

  async function deleteAgent(id: string) {
    try {
      await $fetch(`/api/chatbot/agents/${id}`, { method: 'DELETE' })
      agents.value = agents.value.filter((a) => a.id !== id)
      if (selectedAgentId.value === id) selectedAgentId.value = defaultAgent.value?.id ?? null
    } catch (err) {
      reportError(err, 'Failed to delete agent')
    }
  }

  // ── Attachments ──
  async function uploadFile(file: File): Promise<ChatbotAttachment | null> {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await $fetch<ChatbotAttachment>('/api/chatbot/upload', {
        method: 'POST',
        body: fd,
      })
      pendingAttachments.value = [...pendingAttachments.value, res]
      return res
    } catch (err) {
      reportError(err, 'Upload failed')
      return null
    }
  }

  function removeAttachment(id: string) {
    pendingAttachments.value = pendingAttachments.value.filter((a) => a.id !== id)
  }

  // ── Streaming send ──
  function abort() {
    abortController?.abort()
    abortController = null
    isStreaming.value = false
  }

  async function send(content: string) {
    const trimmed = content.trim()
    if (!trimmed && pendingAttachments.value.length === 0) return
    if (isStreaming.value) return

    // Lazy-create a conversation if there's no active one.
    if (!currentConversationId.value) {
      const created = await newConversation()
      if (!created) return
    }
    const conversationId = currentConversationId.value
    if (!conversationId) return

    error.value = null

    const userMessage: ChatbotMessage = {
      id: newId(),
      role: 'user',
      content: trimmed,
      attachments: pendingAttachments.value.length ? [...pendingAttachments.value] : undefined,
      createdAt: Date.now(),
    }
    messages.value = [...messages.value, userMessage]

    const assistantMessage: ChatbotMessage = {
      id: newId(),
      role: 'assistant',
      content: '',
      reasoning: '',
      toolCalls: [],
      sources: [],
      createdAt: Date.now(),
    }
    messages.value = [...messages.value, assistantMessage]

    const attachmentIds = userMessage.attachments?.map((a) => a.id) ?? []
    pendingAttachments.value = []

    isStreaming.value = true
    abortController = new AbortController()

    try {
      const res = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          agentId: selectedAgentId.value,
          aiConfigId: selectedAiConfigId.value,
          scope: scope.value,
          thinking: thinking.value,
          messages: messages.value
            .slice(0, -1) // exclude the empty assistant placeholder
            .map((m) => ({
              role: m.role,
              content: m.content,
              ...(m.id === userMessage.id && attachmentIds.length
                ? { attachmentIds }
                : {}),
            })),
        }),
        signal: abortController.signal,
      })

      if (!res.ok || !res.body) {
        let msg = `Request failed (${res.status})`
        try {
          const data = await res.json() as { statusMessage?: string; message?: string }
          msg = data.statusMessage || data.message || msg
        } catch { /* ignore */ }
        throw new Error(msg)
      }

      await consumeStream(res.body, assistantMessage)

      // After streaming, refresh the conversation list (preview/timestamp/title).
      void refreshConversations()
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        assistantMessage.content += assistantMessage.content ? '\n\n_Stopped by user._' : '_Stopped by user._'
        // Still surface this as info so user knows it landed.
      } else {
        const msg = describeError(err, 'Unknown error')
        error.value = msg
        assistantMessage.content = assistantMessage.content || `⚠️ ${msg}`
        toast.error('Chat failed', { message: msg })
        console.error('[chatbot] send failed', err)
      }
    } finally {
      // Force reactivity since we mutated assistantMessage in place.
      messages.value = [...messages.value]
      isStreaming.value = false
      abortController = null
    }
  }

  async function consumeStream(body: ReadableStream<Uint8Array>, target: ChatbotMessage) {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })

      // Parse SSE messages: each event is `data: <json>\n\n`
      let idx
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const raw = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data:')) continue
          const json = line.slice(5).trim()
          if (!json) continue
          try {
            applyEvent(JSON.parse(json) as ChatbotStreamEvent, target)
          } catch (parseErr) {
            console.warn('[chatbot] dropped malformed event', parseErr)
          }
        }
        // Force reactivity periodically — Vue 3 ref array doesn't deep-track
        // mutations to nested objects.
        messages.value = [...messages.value]
      }
    }
  }

  function applyEvent(ev: ChatbotStreamEvent, target: ChatbotMessage) {
    switch (ev.type) {
      case 'text-delta':
        target.content += ev.text
        break
      case 'reasoning-delta':
        target.reasoning = (target.reasoning ?? '') + ev.text
        break
      case 'tool-call': {
        const tc: ChatbotToolCall = {
          id: ev.id,
          name: ev.name,
          input: ev.input,
          status: 'pending',
        }
        target.toolCalls = [...(target.toolCalls ?? []), tc]
        break
      }
      case 'tool-result': {
        const list = target.toolCalls ?? []
        const i = list.findIndex((t) => t.id === ev.id)
        if (i >= 0) {
          list[i] = { ...list[i]!, output: ev.output, status: 'success' }
          target.toolCalls = [...list]
        }
        break
      }
      case 'tool-error': {
        const list = target.toolCalls ?? []
        const i = list.findIndex((t) => t.id === ev.id)
        if (i >= 0) {
          list[i] = { ...list[i]!, output: { error: ev.error }, status: 'error' }
          target.toolCalls = [...list]
        }
        // Also surface tool errors as toasts — silent failures are the worst.
        toast.error('Tool failed', { message: ev.error })
        break
      }
      case 'source': {
        target.sources = [...(target.sources ?? []), ev.source]
        if (!sources.value.find((s) => s.id === ev.source.id)) {
          sources.value = [...sources.value, ev.source]
        }
        break
      }
      case 'conversation-meta': {
        if (ev.title) {
          conversations.value = conversations.value.map((c) =>
            c.id === ev.conversationId ? { ...c, title: ev.title! } : c,
          )
        }
        break
      }
      case 'finish':
        // Could surface usage somewhere; ignored for now.
        break
      case 'error':
        target.content += `\n\n⚠️ ${ev.error}`
        error.value = ev.error
        toast.error('Assistant error', { message: ev.error })
        console.error('[chatbot] server error event', ev.error)
        break
    }
  }

  return {
    // collections
    conversations,
    folders,
    agents,
    // current
    currentConversationId,
    currentConversation,
    messages,
    sources,
    // composer state
    pendingAttachments,
    scope,
    thinking,
    selectedAgentId,
    defaultAgent,
    aiConfigs,
    selectedAiConfigId,
    // ui flags
    isStreaming,
    loadingConversation,
    error,
    // actions
    loadAll,
    refreshConversations,
    refreshAgents,
    refreshFolders,
    refreshAiConfigs,
    openConversation,
    newConversation,
    updateConversation,
    deleteConversation,
    createFolder,
    renameFolder,
    deleteFolder,
    createAgent,
    updateAgent,
    deleteAgent,
    uploadFile,
    removeAttachment,
    send,
    abort,
  }
}
