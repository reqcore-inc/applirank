import {
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organization } from './auth'
import { application, candidate } from './app'

// ─────────────────────────────────────────────
// Applicant Portal — Token-based + OAuth Access
// ─────────────────────────────────────────────

/**
 * Secure portal access tokens. Generated when an application is submitted.
 * Each token grants read-only access to a single application's dashboard.
 * Token is a 64-char cryptographic hex string — NOT the primary key.
 */
export const applicantPortalToken = pgTable('applicant_portal_token', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text('token').notNull().unique(),
  applicationId: text('application_id').notNull().references(() => application.id, { onDelete: 'cascade' }),
  candidateId: text('candidate_id').notNull().references(() => candidate.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  /** Token expires after 90 days by default */
  expiresAt: timestamp('expires_at').notNull(),
  lastAccessedAt: timestamp('last_accessed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ([
  index('portal_token_application_id_idx').on(t.applicationId),
  index('portal_token_candidate_id_idx').on(t.candidateId),
  index('portal_token_organization_id_idx').on(t.organizationId),
  index('portal_token_token_idx').on(t.token),
]))

/**
 * Applicant portal accounts — separate from recruiter users.
 * Created when an applicant signs in with Google to save their dashboard.
 * Linked to candidate records via email matching.
 */
export const applicantAccount = pgTable('applicant_account', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  index('applicant_account_email_idx').on(t.email),
  uniqueIndex('applicant_account_google_id_idx').on(t.googleId),
]))

/**
 * Applicant portal sessions — lightweight session management for portal access.
 * Separate from Better Auth sessions (which are for recruiters).
 */
export const applicantSession = pgTable('applicant_session', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  applicantAccountId: text('applicant_account_id').notNull().references(() => applicantAccount.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ([
  index('applicant_session_account_id_idx').on(t.applicantAccountId),
  index('applicant_session_token_idx').on(t.token),
]))

// ─────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────

export const applicantPortalTokenRelations = relations(applicantPortalToken, ({ one }) => ({
  application: one(application, { fields: [applicantPortalToken.applicationId], references: [application.id] }),
  candidate: one(candidate, { fields: [applicantPortalToken.candidateId], references: [candidate.id] }),
  organization: one(organization, { fields: [applicantPortalToken.organizationId], references: [organization.id] }),
}))

export const applicantAccountRelations = relations(applicantAccount, ({ many }) => ({
  sessions: many(applicantSession),
}))

export const applicantSessionRelations = relations(applicantSession, ({ one }) => ({
  account: one(applicantAccount, { fields: [applicantSession.applicantAccountId], references: [applicantAccount.id] }),
}))
