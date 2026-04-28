/**
 * Extract structured "sources" from a chatbot tool result.
 *
 * The Sources panel surfaces the concrete jobs, candidates, applications,
 * documents and attachments the assistant looked at during a turn. We rely
 * on the well-defined output shapes of `buildChatbotTools` (see
 * `server/utils/ai/chatTools.ts`) — when those tools change, this extractor
 * needs to keep up.
 *
 * Defensive: anything we don't recognise returns []. Never throws.
 */
import type { ChatbotSource } from '../../shared/chatbot'

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

function asObject(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

export function extractChatbotSources(toolName: string, output: unknown): ChatbotSource[] {
  try {
    const out = asObject(output)
    if (!out) return []

    switch (toolName) {
      case 'list_jobs': {
        return asArray(out.jobs).map((row): ChatbotSource | null => {
          const j = asObject(row)
          if (!j) return null
          const id = asString(j.id)
          const title = asString(j.title)
          if (!id || !title) return null
          const status = asString(j.status)
          return {
            id: `job:${id}`,
            kind: 'job',
            label: title,
            detail: status ? `Job · ${status}` : 'Job',
            entityId: id,
          }
        }).filter((s): s is ChatbotSource => s !== null)
      }

      case 'get_job': {
        const j = asObject(out.job)
        if (!j) return []
        const id = asString(j.id)
        const title = asString(j.title)
        if (!id || !title) return []
        const location = asString(j.location)
        const status = asString(j.status)
        return [{
          id: `job:${id}`,
          kind: 'job',
          label: title,
          detail: [status, location].filter(Boolean).join(' · ') || 'Job',
          entityId: id,
        }]
      }

      case 'list_applications': {
        return asArray(out.applications).map((row): ChatbotSource | null => {
          const a = asObject(row)
          if (!a) return null
          const id = asString(a.id)
          const candidateName = asString(a.candidateName)
          if (!id) return null
          const status = asString(a.status)
          return {
            id: `application:${id}`,
            kind: 'application',
            label: candidateName ?? 'Application',
            detail: status ? `Application · ${status}` : 'Application',
            entityId: id,
          }
        }).filter((s): s is ChatbotSource => s !== null)
      }

      case 'search_candidates': {
        return asArray(out.candidates).map((row): ChatbotSource | null => {
          const c = asObject(row)
          if (!c) return null
          const id = asString(c.id)
          const name = asString(c.name)
          if (!id || !name) return null
          const email = asString(c.email)
          return {
            id: `candidate:${id}`,
            kind: 'candidate',
            label: name,
            detail: email ?? 'Candidate',
            entityId: id,
          }
        }).filter((s): s is ChatbotSource => s !== null)
      }

      case 'get_candidate': {
        const c = asObject(out.candidate)
        if (!c) return []
        const id = asString(c.id)
        const name = asString(c.name)
        if (!id || !name) return []
        const email = asString(c.email)
        return [{
          id: `candidate:${id}`,
          kind: 'candidate',
          label: name,
          detail: email ?? 'Candidate',
          entityId: id,
        }]
      }

      case 'read_resume': {
        const id = asString(out.documentId) ?? asString(out.id)
        const filename = asString(out.filename) ?? 'Resume'
        if (!id) return []
        return [{
          id: `document:${id}`,
          kind: 'document',
          label: filename,
          detail: 'Resume',
          entityId: id,
        }]
      }

      case 'get_application_scores': {
        const id = asString(out.applicationId)
        if (!id) return []
        const candidateName = asString(out.candidateName)
        return [{
          id: `application:${id}`,
          kind: 'application',
          label: candidateName ?? 'Application',
          detail: 'Scores',
          entityId: id,
        }]
      }

      case 'read_attachment': {
        const id = asString(out.id) ?? asString(out.attachmentId)
        const filename = asString(out.filename) ?? 'Attachment'
        if (!id) return []
        return [{
          id: `attachment:${id}`,
          kind: 'attachment',
          label: filename,
          detail: 'Uploaded file',
          entityId: id,
        }]
      }

      default:
        return []
    }
  } catch {
    // Never let source extraction break the stream.
    return []
  }
}
