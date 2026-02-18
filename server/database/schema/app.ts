import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organization } from './auth'

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export const jobStatusEnum = pgEnum('job_status', ['draft', 'open', 'closed', 'archived'])
export const jobTypeEnum = pgEnum('job_type', ['full_time', 'part_time', 'contract', 'internship'])
export const applicationStatusEnum = pgEnum('application_status', [
  'new', 'screening', 'interview', 'offer', 'hired', 'rejected',
])
export const documentTypeEnum = pgEnum('document_type', ['resume', 'cover_letter', 'other'])
export const questionTypeEnum = pgEnum('question_type', [
  'short_text', 'long_text', 'single_select', 'multi_select',
  'number', 'date', 'url', 'checkbox', 'file_upload',
])

// ─────────────────────────────────────────────
// ATS Domain Tables — ALL scoped by organizationId
// ─────────────────────────────────────────────

/**
 * Jobs / Positions within an organization.
 */
export const job = pgTable('job', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  location: text('location'),
  type: jobTypeEnum('type').notNull().default('full_time'),
  status: jobStatusEnum('status').notNull().default('draft'),
  // ── SEO / Rich Results fields ──
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: text('salary_currency'),
  salaryUnit: text('salary_unit'),
  remoteStatus: text('remote_status'),
  validThrough: timestamp('valid_through'),
  // ── Timestamps ──
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  index('job_organization_id_idx').on(t.organizationId),
]))

/**
 * Candidates (applicants) belonging to a specific tenant.
 */
export const candidate = pgTable('candidate', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  index('candidate_organization_id_idx').on(t.organizationId),
  uniqueIndex('candidate_org_email_idx').on(t.organizationId, t.email),
]))

/**
 * An application links a candidate to a job within the same organization.
 */
export const application = pgTable('application', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  candidateId: text('candidate_id').notNull().references(() => candidate.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => job.id, { onDelete: 'cascade' }),
  status: applicationStatusEnum('status').notNull().default('new'),
  score: integer('score'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  index('application_organization_id_idx').on(t.organizationId),
  index('application_candidate_id_idx').on(t.candidateId),
  index('application_job_id_idx').on(t.jobId),
  uniqueIndex('application_org_candidate_job_idx').on(t.organizationId, t.candidateId, t.jobId),
]))

/**
 * Documents stored in MinIO (resumes, cover letters, etc.).
 * `storageKey` is the S3 object key in the bucket.
 * `parsedContent` holds the structured JSON output from PDF parsing.
 */
export const document = pgTable('document', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  candidateId: text('candidate_id').notNull().references(() => candidate.id, { onDelete: 'cascade' }),
  type: documentTypeEnum('type').notNull().default('resume'),
  storageKey: text('storage_key').notNull().unique(),
  originalFilename: text('original_filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes'),
  parsedContent: jsonb('parsed_content'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ([
  index('document_organization_id_idx').on(t.organizationId),
  index('document_candidate_id_idx').on(t.candidateId),
]))

// ─────────────────────────────────────────────
// Custom Application Form Questions
// ─────────────────────────────────────────────

/**
 * Custom questions configured by the recruiter for a specific job.
 * These appear on the public application form alongside the standard fields.
 * `options` is only used for `single_select` and `multi_select` types.
 */
export const jobQuestion = pgTable('job_question', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => job.id, { onDelete: 'cascade' }),
  type: questionTypeEnum('type').notNull().default('short_text'),
  label: text('label').notNull(),
  description: text('description'),
  required: boolean('required').notNull().default(false),
  options: jsonb('options').$type<string[]>(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  index('job_question_organization_id_idx').on(t.organizationId),
  index('job_question_job_id_idx').on(t.jobId),
]))

/**
 * Applicant responses to custom questions, stored per application.
 * `value` is stored as JSONB to support different response types
 * (string, string[], number, boolean).
 */
export const questionResponse = pgTable('question_response', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  applicationId: text('application_id').notNull().references(() => application.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => jobQuestion.id, { onDelete: 'cascade' }),
  value: jsonb('value').$type<string | string[] | number | boolean>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ([
  index('question_response_organization_id_idx').on(t.organizationId),
  index('question_response_application_id_idx').on(t.applicationId),
  index('question_response_question_id_idx').on(t.questionId),
]))

// ─────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────

export const jobRelations = relations(job, ({ one, many }) => ({
  organization: one(organization, { fields: [job.organizationId], references: [organization.id] }),
  applications: many(application),
  questions: many(jobQuestion),
}))

export const candidateRelations = relations(candidate, ({ one, many }) => ({
  organization: one(organization, { fields: [candidate.organizationId], references: [organization.id] }),
  applications: many(application),
  documents: many(document),
}))

export const applicationRelations = relations(application, ({ one, many }) => ({
  organization: one(organization, { fields: [application.organizationId], references: [organization.id] }),
  candidate: one(candidate, { fields: [application.candidateId], references: [candidate.id] }),
  job: one(job, { fields: [application.jobId], references: [job.id] }),
  responses: many(questionResponse),
}))

export const documentRelations = relations(document, ({ one }) => ({
  organization: one(organization, { fields: [document.organizationId], references: [organization.id] }),
  candidate: one(candidate, { fields: [document.candidateId], references: [candidate.id] }),
}))

export const jobQuestionRelations = relations(jobQuestion, ({ one }) => ({
  organization: one(organization, { fields: [jobQuestion.organizationId], references: [organization.id] }),
  job: one(job, { fields: [jobQuestion.jobId], references: [job.id] }),
}))

export const questionResponseRelations = relations(questionResponse, ({ one }) => ({
  organization: one(organization, { fields: [questionResponse.organizationId], references: [organization.id] }),
  application: one(application, { fields: [questionResponse.applicationId], references: [application.id] }),
  question: one(jobQuestion, { fields: [questionResponse.questionId], references: [jobQuestion.id] }),
}))
