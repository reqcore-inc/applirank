import { z } from 'zod'

// ─── AI Config Schemas ────────────────────────────────────────────

const safeBaseUrl = z.string().url().max(500)
  .refine(url => {
    try {
      const parsed = new URL(url)
      // Block cloud metadata endpoints (SSRF)
      if (parsed.hostname === '169.254.169.254') return false
      if (parsed.hostname === 'metadata.google.internal') return false
      return true
    } catch { return false }
  }, 'URL must not target internal metadata endpoints')

export const createAiConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'openai_compatible']),
  model: z.string().min(1).max(200),
  apiKey: z.string().min(1).max(500).optional(),
  baseUrl: safeBaseUrl.nullish(),
  maxTokens: z.number().int().min(256).max(32768).optional().default(4096),
  inputPricePer1m: z.number().min(0).max(9999).nullish(),
  outputPricePer1m: z.number().min(0).max(9999).nullish(),
})

export const updateAiConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'openai_compatible']).optional(),
  model: z.string().min(1).max(200).optional(),
  apiKey: z.string().min(1).max(500).optional(),
  baseUrl: safeBaseUrl.nullish(),
  maxTokens: z.number().int().min(256).max(32768).optional(),
  inputPricePer1m: z.number().min(0).max(9999).nullish(),
  outputPricePer1m: z.number().min(0).max(9999).nullish(),
})

// ─── Scoring Criterion Schemas ────────────────────────────────────

const criterionCategoryValues = ['technical', 'experience', 'soft_skills', 'education', 'culture', 'custom'] as const

export const createCriterionSchema = z.object({
  key: z.string()
    .min(1).max(100)
    .regex(/^[a-z][a-z0-9_]*$/, 'Key must be lowercase alphanumeric with underscores, starting with a letter'),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullish(),
  category: z.enum(criterionCategoryValues).optional().default('custom'),
  maxScore: z.number().int().min(1).max(100).optional().default(10),
  weight: z.number().int().min(0).max(100).optional().default(50),
  displayOrder: z.number().int().min(0).optional().default(0),
})

export const updateCriterionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullish(),
  category: z.enum(criterionCategoryValues).optional(),
  maxScore: z.number().int().min(1).max(100).optional(),
  weight: z.number().int().min(0).max(100).optional(),
  displayOrder: z.number().int().min(0).optional(),
})

export const bulkCriteriaSchema = z.object({
  criteria: z.array(createCriterionSchema).min(1).max(20),
})

export const updateWeightsSchema = z.object({
  weights: z.array(z.object({
    key: z.string().min(1).max(100),
    weight: z.number().int().min(0).max(100),
  })).min(1).max(20),
})

// ─── Generate Criteria Schema ─────────────────────────────────────

export const generateCriteriaSchema = z.object({
  template: z.enum(['standard', 'technical', 'non_technical']).optional(),
})
