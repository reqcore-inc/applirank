/**
 * HMAC-signed tokens for candidate interview responses.
 *
 * Tokens encode {interviewId, action, exp} and are signed with
 * BETTER_AUTH_SECRET using HMAC-SHA256. This allows candidates to
 * accept/decline/tentative an interview via a simple link — no
 * authentication required, no inbound email infrastructure needed.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export type CandidateAction = 'accepted' | 'declined' | 'tentative'

const VALID_ACTIONS: CandidateAction[] = ['accepted', 'declined', 'tentative']

/** Default token expiry: 7 days */
const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

interface TokenPayload {
  /** Interview UUID */
  id: string
  /** Response action */
  action: CandidateAction
  /** Expiry timestamp (ms since epoch) */
  exp: number
}

/**
 * Compute HMAC-SHA256 signature for a payload string.
 */
function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Generate a signed interview response token.
 *
 * Token format: base64url({id, action, exp}).signature
 * The signature prevents tampering; expiry prevents indefinite reuse.
 */
export function generateInterviewToken(
  interviewId: string,
  action: CandidateAction,
  secret: string,
  expiryMs: number = DEFAULT_EXPIRY_MS,
): string {
  const payload: TokenPayload = {
    id: interviewId,
    action,
    exp: Date.now() + expiryMs,
  }

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = sign(payloadStr, secret)

  return `${payloadStr}.${signature}`
}

/**
 * Verify and decode an interview response token.
 * Returns the payload if valid, or null if the signature is invalid or the token is expired.
 */
export function verifyInterviewToken(
  token: string,
  secret: string,
): TokenPayload | null {
  const dotIndex = token.indexOf('.')
  if (dotIndex === -1) return null

  const payloadStr = token.slice(0, dotIndex)
  const providedSig = token.slice(dotIndex + 1)

  // Verify signature with timing-safe comparison
  const expectedSig = sign(payloadStr, secret)
  if (providedSig.length !== expectedSig.length) return null

  const sigValid = timingSafeEqual(
    Buffer.from(providedSig, 'hex'),
    Buffer.from(expectedSig, 'hex'),
  )
  if (!sigValid) return null

  // Decode and validate payload
  let payload: TokenPayload
  try {
    const decoded = Buffer.from(payloadStr, 'base64url').toString('utf-8')
    payload = JSON.parse(decoded) as TokenPayload
  }
  catch {
    return null
  }

  // Validate structure
  if (
    typeof payload.id !== 'string'
    || !VALID_ACTIONS.includes(payload.action)
    || typeof payload.exp !== 'number'
  ) {
    return null
  }

  // Check expiry
  if (Date.now() > payload.exp) return null

  return payload
}

/**
 * Build the three response URLs (accept, decline, tentative) for an interview.
 */
export function buildResponseUrls(
  baseUrl: string,
  interviewId: string,
  secret: string,
): Record<CandidateAction, string> {
  const actions: CandidateAction[] = ['accepted', 'declined', 'tentative']
  const urls = {} as Record<CandidateAction, string>

  for (const action of actions) {
    const token = generateInterviewToken(interviewId, action, secret)
    urls[action] = `${baseUrl}/interview/respond?token=${encodeURIComponent(token)}`
  }

  return urls
}
