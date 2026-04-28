/**
 * Shared chatbot types — used by both the server endpoint and the client UI.
 *
 * Conventions:
 *   - Conversations, messages, folders and custom agents are PERSISTED per
 *     user inside an organization. The client passes a `conversationId` with
 *     each chat request so the server can append both the user message and
 *     the assistant reply (including tool calls + sources) to history.
 *   - Folders and agents (custom system prompts) are private to the user.
 *   - File attachments are uploaded once via /api/chatbot/upload and then
 *     referenced by `attachmentId` in subsequent messages. Parsed text is
 *     held server-side in memory under the user's session for a short TTL.
 */

/** Maximum size for chatbot file uploads (8 MB). */
export const CHATBOT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024

/** Maximum number of attachments a user can include in a single message. */
export const CHATBOT_MAX_ATTACHMENTS_PER_MESSAGE = 5

/** Maximum number of messages kept in a single conversation. */
export const CHATBOT_MAX_MESSAGES = 50

/** Maximum characters of attachment text injected into the model prompt. */
export const CHATBOT_MAX_ATTACHMENT_CHARS = 40_000

/**
 * The scope determines what slice of organization data the assistant can read.
 *  - 'organization' → all jobs, candidates, applications, documents
 *  - 'job'          → restricted to a single job and its applications/candidates
 */
export type ChatbotScopeKind = 'organization' | 'job'

export interface ChatbotScope {
  kind: ChatbotScopeKind
  /** Required when kind === 'job' */
  jobId?: string
}

/** A single attachment uploaded via /api/chatbot/upload. */
export interface ChatbotAttachment {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  /** Number of characters extracted from the file (for display only). */
  textLength: number
}

export type ChatbotRole = 'user' | 'assistant'

export interface ChatbotMessage {
  id: string
  role: ChatbotRole
  /** Visible text content. */
  content: string
  /** Optional reasoning trace (assistant only). */
  reasoning?: string
  /** Tool calls executed during this assistant turn (assistant only). */
  toolCalls?: ChatbotToolCall[]
  /** Sources cited by the assistant — derived from successful tool calls. */
  sources?: ChatbotSource[]
  /** Attachments included with the user message (user only). */
  attachments?: ChatbotAttachment[]
  /** Unix ms timestamp. */
  createdAt: number
}

export interface ChatbotToolCall {
  id: string
  name: string
  /** JSON-serializable input arguments. */
  input: unknown
  /** JSON-serializable output (or { error } on failure). */
  output?: unknown
  status: 'pending' | 'success' | 'error'
}

/**
 * A single source the assistant referenced — surfaced in the Sources panel.
 * Sources are extracted server-side from the outputs of tools like
 * `get_job`, `get_candidate`, `get_application`, `read_resume`, etc.
 */
export type ChatbotSourceKind =
  | 'job'
  | 'candidate'
  | 'application'
  | 'document'
  | 'attachment'

export interface ChatbotSource {
  /** Stable ID — usually the underlying entity ID, prefixed by kind for uniqueness. */
  id: string
  kind: ChatbotSourceKind
  /** The display label shown in the panel (e.g. job title, candidate name). */
  label: string
  /** Optional secondary line (e.g. "Senior Backend Engineer · Open"). */
  detail?: string
  /** Underlying entity ID (without the kind prefix), used to build deep links. */
  entityId: string
}

/** A user-defined agent (custom system prompt + persona). Private per user. */
export interface ChatbotAgent {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  systemPrompt: string
  temperature?: number | null
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

/** Maximum length of a custom agent's system prompt. */
export const CHATBOT_AGENT_PROMPT_MAX = 8000

/** Maximum number of agents a user can create. */
export const CHATBOT_AGENT_MAX_PER_USER = 25

/** A folder grouping conversations in the sidebar. Private per user. */
export interface ChatbotFolder {
  id: string
  name: string
  icon?: string | null
  position: number
  createdAt: number
}

/** Maximum number of folders a user can create. */
export const CHATBOT_FOLDER_MAX_PER_USER = 50

/** Conversation summary used in the sidebar list. */
export interface ChatbotConversationSummary {
  id: string
  title: string
  folderId: string | null
  agentId: string | null
  /** Pinned AI configuration for this conversation. Falls back to the org chatbot default. */
  aiConfigId: string | null
  scope: ChatbotScope
  pinned: boolean
  thinking: boolean
  lastMessagePreview: string | null
  lastMessageAt: number | null
  createdAt: number
}

/** Full conversation including persisted messages. */
export interface ChatbotConversationDetail extends ChatbotConversationSummary {
  messages: ChatbotMessage[]
}

/** POST /api/chatbot/chat request body. */
export interface ChatbotChatRequest {
  /** Persisted conversation to append to. Created upfront via POST /conversations. */
  conversationId: string
  /** Optional override; falls back to the conversation's bound agent (or none). */
  agentId?: string | null
  /** Optional override; falls back to the conversation's pinned config or the org chatbot default. */
  aiConfigId?: string | null
  scope: ChatbotScope
  messages: Array<Pick<ChatbotMessage, 'role' | 'content'> & {
    attachmentIds?: string[]
  }>
  /** Enable extended thinking / reasoning output if supported by provider. */
  thinking?: boolean
}

/** Streaming wire protocol — newline-delimited JSON events over SSE. */
export type ChatbotStreamEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'reasoning-delta'; text: string }
  | { type: 'tool-call'; id: string; name: string; input: unknown }
  | { type: 'tool-result'; id: string; output: unknown }
  | { type: 'tool-error'; id: string; error: string }
  /** A new source was cited (extracted from a successful tool result). */
  | { type: 'source'; source: ChatbotSource }
  /** Conversation metadata updated (e.g. auto-generated title). */
  | { type: 'conversation-meta'; conversationId: string; title?: string }
  | { type: 'finish'; usage?: { promptTokens: number; completionTokens: number } }
  | { type: 'error'; error: string }
