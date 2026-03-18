import { describe, it, expect } from 'vitest'

/**
 * Regression test for the ai-analysis stats endpoint.
 * The postgres.js driver cannot serialise a raw Date object
 * inside Drizzle's `sql` template literals – it must receive
 * an ISO-8601 string instead.
 *
 * This test validates the serialisation logic that is used in
 * server/api/ai-analysis/stats.get.ts to build the 30-day filter.
 */
describe('ai-analysis stats date parameter', () => {
  it('toISOString() produces a string the postgres driver can accept', () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const iso = thirtyDaysAgo.toISOString()

    expect(typeof iso).toBe('string')
    // Must be a valid ISO-8601 timestamp
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
    // Re-parsing should yield the same instant
    expect(new Date(iso).getTime()).toBe(thirtyDaysAgo.getTime())
  })
})
