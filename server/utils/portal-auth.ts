import { eq, and } from 'drizzle-orm'
import { applicantPortalToken, applicantSession, applicantAccount } from '../database/schema'

const TOKEN_EXPIRY_DAYS = 90
const SESSION_EXPIRY_HOURS = 72

/**
 * Generate a cryptographically secure portal access token.
 * Returns a 64-character hex string.
 */
export function generatePortalToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a portal token for a given application.
 * Called during the apply flow after a successful submission.
 */
export async function createPortalToken(
  applicationId: string,
  candidateId: string,
  organizationId: string,
): Promise<string> {
  const token = generatePortalToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS)

  await db.insert(applicantPortalToken).values({
    token,
    applicationId,
    candidateId,
    organizationId,
    expiresAt,
  })

  return token
}

/**
 * Validate a portal token and return the associated data.
 * Returns null if the token is invalid or expired.
 * Updates lastAccessedAt on valid access.
 */
export async function validatePortalToken(token: string) {
  const record = await db.query.applicantPortalToken.findFirst({
    where: eq(applicantPortalToken.token, token),
    columns: {
      id: true,
      applicationId: true,
      candidateId: true,
      organizationId: true,
      expiresAt: true,
    },
  })

  if (!record) return null
  if (record.expiresAt < new Date()) return null

  // Update last accessed (fire-and-forget)
  db.update(applicantPortalToken)
    .set({ lastAccessedAt: new Date() })
    .where(eq(applicantPortalToken.id, record.id))
    .catch(() => {})

  return record
}

/**
 * Create a session for an authenticated applicant account.
 */
export async function createApplicantSession(accountId: string): Promise<string> {
  const token = generatePortalToken()
  const expiresAt = new Date()
  expiresAt.setTime(expiresAt.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000)

  await db.insert(applicantSession).values({
    applicantAccountId: accountId,
    token,
    expiresAt,
  })

  return token
}

/**
 * Validate an applicant session token (from cookie).
 * Returns the applicant account or null.
 */
export async function validateApplicantSession(sessionToken: string) {
  const session = await db.query.applicantSession.findFirst({
    where: and(
      eq(applicantSession.token, sessionToken),
    ),
    with: {
      account: true,
    },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    // Cleanup expired session
    db.delete(applicantSession)
      .where(eq(applicantSession.id, session.id))
      .catch(() => {})
    return null
  }

  return session.account
}

/**
 * Find or create an applicant account from Google OAuth profile.
 */
export async function findOrCreateApplicantAccount(profile: {
  googleId: string
  email: string
  name?: string
  image?: string
}) {
  let account = await db.query.applicantAccount.findFirst({
    where: eq(applicantAccount.googleId, profile.googleId),
  })

  if (account) {
    // Update profile data on each login
    const [updated] = await db
      .update(applicantAccount)
      .set({
        email: profile.email,
        name: profile.name ?? account.name,
        image: profile.image ?? account.image,
        updatedAt: new Date(),
      })
      .where(eq(applicantAccount.id, account.id))
      .returning()
    return updated!
  }

  // Check if email already has an account (different google ID — shouldn't happen, but guard)
  const [created] = await db.insert(applicantAccount).values({
    googleId: profile.googleId,
    email: profile.email,
    name: profile.name,
    image: profile.image,
  }).returning()

  return created!
}
