import { z } from 'zod'

// ─────────────────────────────────────────────
// Candidate validation schemas — shared across API routes
// ─────────────────────────────────────────────

const genderValues = ['male', 'female', 'other', 'prefer_not_to_say'] as const

/** ISO 8601 date string (YYYY-MM-DD), validated to be a real date in a reasonable range */
const dobSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
  .refine((val) => {
    const d = new Date(val)
    if (isNaN(d.getTime())) return false
    const year = d.getFullYear()
    const now = new Date()
    return year >= 1900 && d <= now
  }, 'Date of birth must be a valid past date')

/** Schema for creating a new candidate */
export const createCandidateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  displayName: z.string().max(200).optional(),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255)
    .transform((v) => v.toLowerCase().trim()),
  phone: z.string().max(50).optional(),
  gender: z.enum(genderValues).optional(),
  dateOfBirth: dobSchema.optional(),
  quickNotes: z.string().max(1000).optional(),
})

/** Schema for updating an existing candidate (all fields optional) */
export const updateCandidateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100).optional(),
  displayName: z.string().max(200).nullish(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .transform((v) => v.toLowerCase().trim())
    .optional(),
  phone: z.string().max(50).nullish(),
  gender: z.enum(genderValues).nullish(),
  dateOfBirth: dobSchema.nullish(),
  quickNotes: z.string().max(1000).nullish(),
})

/** Schema for candidate list query params */
export const candidateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  gender: z.enum(genderValues).optional(),
  dobFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dobFrom must be YYYY-MM-DD').optional(),
  dobTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dobTo must be YYYY-MM-DD').optional(),
})

/** Reusable schema for `:id` route params */
export const candidateIdParamSchema = z.object({
  id: z.string().min(1),
})
