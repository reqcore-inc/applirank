import { describe, it, expect } from 'vitest'
import {
  createTrackingLinkSchema,
  updateTrackingLinkSchema,
  trackingLinkIdSchema,
  trackingLinkQuerySchema,
  sourceStatsQuerySchema,
  applicationSourceSchema,
} from '../../server/utils/schemas/trackingLink'

// ─────────────────────────────────────────────
// 1. createTrackingLinkSchema
// ─────────────────────────────────────────────

describe('createTrackingLinkSchema', () => {
  it('accepts minimal valid input (name only)', () => {
    const result = createTrackingLinkSchema.parse({ name: 'LinkedIn Q1' })
    expect(result.name).toBe('LinkedIn Q1')
    expect(result.channel).toBe('custom') // default
    expect(result.jobId).toBeUndefined()
  })

  it('accepts full input with all optional fields', () => {
    const result = createTrackingLinkSchema.parse({
      name: 'Full campaign',
      channel: 'linkedin',
      jobId: 'job-1',
      utmSource: 'linkedin',
      utmMedium: 'social',
      utmCampaign: 'q1-hiring',
      utmTerm: 'engineering',
      utmContent: 'banner',
    })
    expect(result.channel).toBe('linkedin')
    expect(result.utmCampaign).toBe('q1-hiring')
  })

  it('rejects empty name', () => {
    expect(() => createTrackingLinkSchema.parse({ name: '' })).toThrow()
  })

  it('rejects name exceeding 200 chars', () => {
    expect(() => createTrackingLinkSchema.parse({ name: 'x'.repeat(201) })).toThrow()
  })

  it('rejects invalid channel value', () => {
    expect(() => createTrackingLinkSchema.parse({ name: 'ok', channel: 'invalid_channel' })).toThrow()
  })

  it('rejects UTM fields exceeding 200 chars', () => {
    expect(() =>
      createTrackingLinkSchema.parse({ name: 'ok', utmSource: 'a'.repeat(201) }),
    ).toThrow()
  })

  it('strips unknown properties', () => {
    const result = createTrackingLinkSchema.parse({
      name: 'test',
      __proto__: { admin: true },
      malicious: 'payload',
    } as any)
    expect((result as any).malicious).toBeUndefined()
  })
})

// ─────────────────────────────────────────────
// 2. updateTrackingLinkSchema
// ─────────────────────────────────────────────

describe('updateTrackingLinkSchema', () => {
  it('accepts empty update (all optional)', () => {
    const result = updateTrackingLinkSchema.parse({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('accepts partial update', () => {
    const result = updateTrackingLinkSchema.parse({ isActive: false })
    expect(result.isActive).toBe(false)
    expect(result.name).toBeUndefined()
  })

  it('rejects empty name', () => {
    expect(() => updateTrackingLinkSchema.parse({ name: '' })).toThrow()
  })

  it('rejects name exceeding 200 chars', () => {
    expect(() => updateTrackingLinkSchema.parse({ name: 'x'.repeat(201) })).toThrow()
  })

  it('accepts valid channel change', () => {
    const result = updateTrackingLinkSchema.parse({ channel: 'indeed' })
    expect(result.channel).toBe('indeed')
  })

  it('rejects non-boolean isActive', () => {
    expect(() => updateTrackingLinkSchema.parse({ isActive: 'yes' })).toThrow()
  })
})

// ─────────────────────────────────────────────
// 3. trackingLinkIdSchema
// ─────────────────────────────────────────────

describe('trackingLinkIdSchema', () => {
  it('accepts a valid ID string', () => {
    const result = trackingLinkIdSchema.parse({ id: 'abc-123' })
    expect(result.id).toBe('abc-123')
  })

  it('rejects empty ID', () => {
    expect(() => trackingLinkIdSchema.parse({ id: '' })).toThrow()
  })

  it('rejects missing ID', () => {
    expect(() => trackingLinkIdSchema.parse({})).toThrow()
  })
})

// ─────────────────────────────────────────────
// 4. trackingLinkQuerySchema
// ─────────────────────────────────────────────

describe('trackingLinkQuerySchema', () => {
  it('provides defaults for page and limit', () => {
    const result = trackingLinkQuerySchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(50)
  })

  it('coerces string page/limit to numbers', () => {
    const result = trackingLinkQuerySchema.parse({ page: '3', limit: '25' })
    expect(result.page).toBe(3)
    expect(result.limit).toBe(25)
  })

  it('rejects page < 1', () => {
    expect(() => trackingLinkQuerySchema.parse({ page: '0' })).toThrow()
  })

  it('rejects limit > 100', () => {
    expect(() => trackingLinkQuerySchema.parse({ limit: '101' })).toThrow()
  })

  it('transforms isActive string to boolean', () => {
    const active = trackingLinkQuerySchema.parse({ isActive: 'true' })
    expect(active.isActive).toBe(true)

    const inactive = trackingLinkQuerySchema.parse({ isActive: 'false' })
    expect(inactive.isActive).toBe(false)
  })

  it('leaves isActive undefined when not provided', () => {
    const result = trackingLinkQuerySchema.parse({})
    expect(result.isActive).toBeUndefined()
  })

  it('accepts optional jobId and channel filters', () => {
    const result = trackingLinkQuerySchema.parse({ jobId: 'j-1', channel: 'linkedin' })
    expect(result.jobId).toBe('j-1')
    expect(result.channel).toBe('linkedin')
  })
})

// ─────────────────────────────────────────────
// 5. sourceStatsQuerySchema
// ─────────────────────────────────────────────

describe('sourceStatsQuerySchema', () => {
  it('accepts empty query (all optional)', () => {
    const result = sourceStatsQuerySchema.parse({})
    expect(result.jobId).toBeUndefined()
    expect(result.from).toBeUndefined()
    expect(result.to).toBeUndefined()
  })

  it('accepts valid ISO datetime strings', () => {
    const result = sourceStatsQuerySchema.parse({
      from: '2025-01-01T00:00:00Z',
      to: '2025-12-31T23:59:59Z',
    })
    expect(result.from).toBe('2025-01-01T00:00:00Z')
    expect(result.to).toBe('2025-12-31T23:59:59Z')
  })

  it('rejects non-datetime from/to strings', () => {
    expect(() => sourceStatsQuerySchema.parse({ from: 'yesterday' })).toThrow()
  })

  it('accepts optional jobId', () => {
    const result = sourceStatsQuerySchema.parse({ jobId: 'job-abc' })
    expect(result.jobId).toBe('job-abc')
  })
})

// ─────────────────────────────────────────────
// 6. applicationSourceSchema (public apply body)
// ─────────────────────────────────────────────

describe('applicationSourceSchema', () => {
  it('accepts empty object (all optional)', () => {
    const result = applicationSourceSchema.parse({})
    expect(result.ref).toBeUndefined()
  })

  it('accepts valid ref and UTM fields', () => {
    const result = applicationSourceSchema.parse({
      ref: 'TRACK123',
      utmSource: 'linkedin',
      utmMedium: 'social',
      utmCampaign: 'spring-2025',
      utmTerm: 'engineer',
      utmContent: 'banner-ad',
    })
    expect(result.ref).toBe('TRACK123')
    expect(result.utmSource).toBe('linkedin')
  })

  it('rejects ref exceeding 100 chars', () => {
    expect(() => applicationSourceSchema.parse({ ref: 'x'.repeat(101) })).toThrow()
  })

  it('rejects UTM fields exceeding 200 chars', () => {
    expect(() =>
      applicationSourceSchema.parse({ utmSource: 'a'.repeat(201) }),
    ).toThrow()
  })

  it('strips unknown properties', () => {
    const result = applicationSourceSchema.parse({
      ref: 'ok',
      xss: '<script>alert(1)</script>',
    } as any)
    expect((result as any).xss).toBeUndefined()
  })
})
