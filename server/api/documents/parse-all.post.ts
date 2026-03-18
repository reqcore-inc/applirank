import { eq, and, isNull } from 'drizzle-orm'
import { document } from '../../database/schema'
import { parseDocument } from '../../utils/resume-parser'

/**
 * POST /api/documents/parse-all
 *
 * Re-parse all documents in the organization that have no parsedContent.
 * Processes documents sequentially to avoid memory spikes.
 * Returns a summary of successes and failures.
 *
 * Security:
 *   - Auth required (admin/owner)
 *   - Org-scoped — only processes documents belonging to the authenticated org
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { document: ['update'] })
  const orgId = session.session.activeOrganizationId

  // Fetch all documents without parsed content
  const unparsedDocs = await db.select({
    id: document.id,
    storageKey: document.storageKey,
    mimeType: document.mimeType,
    originalFilename: document.originalFilename,
  })
    .from(document)
    .where(and(
      eq(document.organizationId, orgId),
      isNull(document.parsedContent),
    ))

  if (unparsedDocs.length === 0) {
    return { total: 0, parsed: 0, failed: 0, failures: [] }
  }

  let parsed = 0
  const failures: { id: string; filename: string; error: string }[] = []

  for (const doc of unparsedDocs) {
    try {
      const fileBuffer = await downloadFromS3(doc.storageKey)
      const parsedContent = await parseDocument(fileBuffer, doc.mimeType)

      if (parsedContent) {
        await db.update(document)
          .set({ parsedContent: parsedContent as any })
          .where(eq(document.id, doc.id))
        parsed++
      }
      else {
        failures.push({
          id: doc.id,
          filename: doc.originalFilename,
          error: 'No text could be extracted',
        })
      }
    }
    catch (error: any) {
      failures.push({
        id: doc.id,
        filename: doc.originalFilename,
        error: error?.message ?? 'Unknown error',
      })
    }
  }

  return {
    total: unparsedDocs.length,
    parsed,
    failed: failures.length,
    failures,
  }
})
