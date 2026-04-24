import { z } from 'zod'

// ─────────────────────────────────────────────
// Org settings validation schemas
// ─────────────────────────────────────────────

export const updateOrgSettingsSchema = z.object({
  nameDisplayFormat: z.enum(['first_last', 'last_first']).optional(),
  dateFormat: z.enum(['mdy', 'dmy', 'ymd']).optional(),
})
