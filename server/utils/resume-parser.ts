/**
 * Resume Parser
 *
 * Extracts text content from uploaded documents (PDF, DOCX, DOC).
 * Returns structured parsed content for storage in document.parsedContent.
 *
 * Supports:
 *   - PDF — via pdf-parse (pdfjs-dist based)
 *   - DOCX — via mammoth (XML-based, reliable)
 *   - DOC — via word-extractor (OLE2 compound documents)
 */
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'

const PARSER_VERSION = '1.0'

export interface ParsedResume {
  /** Full extracted text content */
  text: string
  /** Detected sections (best-effort heuristic) */
  sections: ResumeSection[]
  /** Parsing metadata */
  metadata: {
    pageCount: number | null
    wordCount: number
    characterCount: number
    extractedAt: string
    parserVersion: string
    sourceFormat: 'pdf' | 'docx' | 'doc'
  }
}

export interface ResumeSection {
  heading: string
  content: string
}

/**
 * Parse a document buffer and extract text content.
 * Routes to the appropriate parser based on MIME type.
 *
 * @param buffer - Raw file bytes
 * @param mimeType - Validated MIME type of the document
 * @returns Structured parsed content, or null if extraction fails
 */
export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
): Promise<ParsedResume | null> {
  try {
    switch (mimeType) {
      case 'application/pdf':
        return await parsePdf(buffer)
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await parseDocx(buffer)
      case 'application/msword':
        return await parseDoc(buffer)
      default:
        console.warn(`[ResumeParser] Unsupported MIME type: ${mimeType}`)
        return null
    }
  }
  catch (error) {
    console.error('[ResumeParser] Failed to parse document:', error)
    return null
  }
}

// ─── PDF Parser ───────────────────────────────────────────────────

async function parsePdf(buffer: Buffer): Promise<ParsedResume | null> {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()

  const text = normalizeText(result.text)
  if (!text) {
    await parser.destroy()
    return null
  }

  const parsed: ParsedResume = {
    text,
    sections: extractSections(text),
    metadata: {
      pageCount: result.total,
      wordCount: countWords(text),
      characterCount: text.length,
      extractedAt: new Date().toISOString(),
      parserVersion: PARSER_VERSION,
      sourceFormat: 'pdf',
    },
  }

  await parser.destroy()
  return parsed
}

// ─── DOCX Parser ──────────────────────────────────────────────────

async function parseDocx(buffer: Buffer): Promise<ParsedResume | null> {
  const result = await mammoth.extractRawText({ buffer })

  const text = normalizeText(result.value)
  if (!text) return null

  return {
    text,
    sections: extractSections(text),
    metadata: {
      pageCount: null, // DOCX doesn't have pages
      wordCount: countWords(text),
      characterCount: text.length,
      extractedAt: new Date().toISOString(),
      parserVersion: PARSER_VERSION,
      sourceFormat: 'docx',
    },
  }
}

// ─── DOC Parser (Legacy) ──────────────────────────────────────────

async function parseDoc(buffer: Buffer): Promise<ParsedResume | null> {
  const extractor = new WordExtractor()
  const doc = await extractor.extract(buffer)

  // Combine main body, headers, and footers
  const parts = [
    doc.getBody(),
    doc.getHeaders({ includeFooters: false }),
    doc.getFooters(),
  ].filter(Boolean)

  const rawText = parts.join('\n')
  const text = normalizeText(rawText)
  if (!text) return null

  return {
    text,
    sections: extractSections(text),
    metadata: {
      pageCount: null,
      wordCount: countWords(text),
      characterCount: text.length,
      extractedAt: new Date().toISOString(),
      parserVersion: PARSER_VERSION,
      sourceFormat: 'doc',
    },
  }
}

// ─── Text Normalization ───────────────────────────────────────────

/**
 * Clean up extracted text: collapse whitespace, trim, remove control chars.
 * Returns empty string if no meaningful content was extracted.
 */
function normalizeText(raw: string): string {
  return raw
    // Remove null bytes and control characters (except newline/tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize Windows line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Collapse 3+ consecutive newlines into 2
    .replace(/\n{3,}/g, '\n\n')
    // Collapse multiple spaces/tabs on same line into one
    .replace(/[^\S\n]+/g, ' ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim()
}

// ─── Section Extraction ───────────────────────────────────────────

/**
 * Best-effort extraction of resume sections based on common heading patterns.
 * This is a heuristic approach — not all resumes follow standard formats.
 */
const SECTION_HEADINGS = [
  // Experience / Work
  /^(?:work\s*)?experience/i,
  /^employment\s*(?:history)?/i,
  /^professional\s*(?:experience|background|history)/i,
  /^career\s*(?:history|summary)/i,
  /^work\s*history/i,

  // Education
  /^education(?:al\s*background)?/i,
  /^academic\s*(?:background|qualifications)/i,
  /^qualifications/i,

  // Skills
  /^(?:technical\s*)?skills/i,
  /^core\s*competencies/i,
  /^technologies/i,
  /^tools?\s*(?:&|and)\s*technologies/i,
  /^expertise/i,

  // Summary / Profile / Objective
  /^(?:professional\s*)?summary/i,
  /^(?:career\s*)?objective/i,
  /^profile/i,
  /^about\s*(?:me)?/i,

  // Certifications / Awards
  /^certifications?/i,
  /^licenses?\s*(?:&|and)\s*certifications?/i,
  /^awards?\s*(?:&|and)\s*(?:honors?|achievements?)/i,
  /^achievements?/i,
  /^honors?/i,

  // Projects / Publications
  /^(?:key\s*)?projects?/i,
  /^publications?/i,
  /^research/i,
  /^portfolio/i,

  // Languages / Interests
  /^languages?/i,
  /^interests?\s*(?:&|and)\s*(?:hobbies|activities)/i,
  /^hobbies/i,
  /^volunteer(?:ing)?\s*(?:experience)?/i,

  // References
  /^references?/i,

  // Contact
  /^contact\s*(?:information|details)?/i,
  /^personal\s*(?:information|details)/i,
]

function extractSections(text: string): ResumeSection[] {
  const lines = text.split('\n')
  const sections: ResumeSection[] = []
  let currentHeading: string | null = null
  let currentContent: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      currentContent.push('')
      continue
    }

    // Check if this line matches a known section heading pattern
    // Headings are typically short (< 60 chars) and on their own line
    const isHeading = trimmed.length < 60 && SECTION_HEADINGS.some(pattern => pattern.test(trimmed))

    if (isHeading) {
      // Save previous section
      if (currentHeading !== null) {
        const content = currentContent.join('\n').trim()
        if (content) {
          sections.push({ heading: currentHeading, content })
        }
      }
      currentHeading = trimmed
      currentContent = []
    }
    else {
      currentContent.push(trimmed)
    }
  }

  // Save last section
  if (currentHeading !== null) {
    const content = currentContent.join('\n').trim()
    if (content) {
      sections.push({ heading: currentHeading, content })
    }
  }

  return sections
}

// ─── Helpers ──────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

// ─── Resume Text Extraction ──────────────────────────────────────

/**
 * Extract plain text from a parsedContent JSONB value.
 * Handles both the structured ParsedResume format and legacy string values.
 * Used by the scoring/analysis endpoints.
 *
 * @param parsedContent - The raw JSONB value from document.parsedContent
 * @returns The extracted text, or null if no content is available
 */
export function extractResumeText(parsedContent: unknown): string | null {
  if (!parsedContent) return null

  // Structured ParsedResume format: { text: "...", sections: [...], metadata: {...} }
  if (typeof parsedContent === 'object' && parsedContent !== null && 'text' in parsedContent) {
    const text = (parsedContent as { text: unknown }).text
    if (typeof text === 'string' && text.trim()) return text
    // If it has a text property but it's empty, there's no useful content
    return null
  }

  // Legacy: plain string value
  if (typeof parsedContent === 'string' && parsedContent.trim()) {
    return parsedContent
  }

  // Fallback: stringify object (should rarely happen)
  if (typeof parsedContent === 'object') {
    const str = JSON.stringify(parsedContent)
    return str && str !== '{}' && str !== '[]' ? str : null
  }

  return null
}
