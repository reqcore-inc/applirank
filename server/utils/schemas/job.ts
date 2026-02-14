import { z } from 'zod'

// ─────────────────────────────────────────────
// Job validation schemas — shared across API routes
// ─────────────────────────────────────────────

/** Schema for creating a new job */
export const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['full_time', 'part_time', 'contract', 'internship']).default('full_time'),
  /** Optional custom slug — if omitted, generated from title */
  slug: z.string().max(80).optional(),
})

/** Schema for updating an existing job (all fields optional, includes status) */
export const updateJobSchema = createJobSchema.partial().extend({
  status: z.enum(['draft', 'open', 'closed', 'archived']).optional(),
})

/** Schema for job list query params */
export const jobQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'open', 'closed', 'archived']).optional(),
})

/** Reusable schema for `:id` route params */
export const idParamSchema = z.object({
  id: z.string().min(1),
})

// ─────────────────────────────────────────────
// Status transition rules
// ─────────────────────────────────────────────

/**
 * Allowed status transitions for jobs.
 * `archived` is terminal — no transitions allowed from it.
 */
export const JOB_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['open', 'archived'],
  open: ['closed', 'archived'],
  closed: ['open', 'archived'],
  archived: ['draft', 'open'],
}
