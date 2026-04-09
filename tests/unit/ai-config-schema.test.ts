import { describe, it, expect } from 'vitest'
import { createAiConfigSchema } from '../../server/utils/schemas/scoring'

/**
 * Validates the AI config schema accepts all supported providers,
 * especially 'openai_compatible' (issue #130).
 */
describe('createAiConfigSchema', () => {
  it('accepts openai_compatible provider with baseUrl', () => {
    const result = createAiConfigSchema.safeParse({
      provider: 'openai_compatible',
      model: 'llama-3.1-8b',
      apiKey: 'test-key',
      baseUrl: 'http://localhost:11434/v1',
      maxTokens: 4096,
    })

    expect(result.success).toBe(true)
  })

  it('accepts openai_compatible without baseUrl', () => {
    const result = createAiConfigSchema.safeParse({
      provider: 'openai_compatible',
      model: 'custom-model',
      apiKey: 'test-key',
    })

    expect(result.success).toBe(true)
  })

  it('accepts standard openai provider', () => {
    const result = createAiConfigSchema.safeParse({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      apiKey: 'sk-test123',
    })

    expect(result.success).toBe(true)
  })

  it('rejects unknown provider', () => {
    const result = createAiConfigSchema.safeParse({
      provider: 'ollama',
      model: 'llama-3.1',
      apiKey: 'test',
    })

    expect(result.success).toBe(false)
  })

  it('rejects SSRF-risky baseUrl targeting cloud metadata', () => {
    const result = createAiConfigSchema.safeParse({
      provider: 'openai_compatible',
      model: 'test',
      apiKey: 'test',
      baseUrl: 'http://169.254.169.254/latest/meta-data/',
    })

    expect(result.success).toBe(false)
  })

  it('allows apiKey to be omitted (for updates with existing key)', () => {
    const result = createAiConfigSchema.safeParse({
      provider: 'openai',
      model: 'gpt-4.1-mini',
    })

    expect(result.success).toBe(true)
  })
})
