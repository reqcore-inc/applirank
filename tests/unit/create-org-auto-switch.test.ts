import { describe, it, expect } from 'vitest'

/**
 * Unit tests for the auto-switch guard logic in create-org.vue.
 *
 * The auto-switch watcher should ONLY redirect when:
 *   - User has exactly 1 org
 *   - No active organization is set in the session
 *
 * It must NOT redirect when an active org already exists,
 * because that means the user intentionally navigated to create-org
 * (e.g. via the org switcher's "+ Create organization" link).
 *
 * Regression test for: https://github.com/reqcore-inc/reqcore/issues/131
 */

interface AutoSwitchContext {
  loading: boolean
  autoSwitched: boolean
  viewMode: 'picker' | 'create' | 'join'
  orgCount: number
  activeOrg: { id: string; name: string } | null | undefined
}

/**
 * Mirrors the guard logic from create-org.vue watcher.
 * Returns true when auto-switch should fire.
 */
function shouldAutoSwitch(ctx: AutoSwitchContext): boolean {
  if (ctx.loading || ctx.autoSwitched || ctx.viewMode !== 'picker') return false
  if (ctx.orgCount === 1 && !ctx.activeOrg) return true
  return false
}

describe('create-org auto-switch guard', () => {
  const base: AutoSwitchContext = {
    loading: false,
    autoSwitched: false,
    viewMode: 'picker',
    orgCount: 1,
    activeOrg: null,
  }

  it('auto-switches when user has 1 org and no active org (invite flow)', () => {
    expect(shouldAutoSwitch({ ...base })).toBe(true)
  })

  it('does NOT auto-switch when user already has an active org (#131)', () => {
    expect(
      shouldAutoSwitch({
        ...base,
        activeOrg: { id: 'org-1', name: 'My Org' },
      }),
    ).toBe(false)
  })

  it('does NOT auto-switch when still loading', () => {
    expect(shouldAutoSwitch({ ...base, loading: true })).toBe(false)
  })

  it('does NOT auto-switch when already auto-switched', () => {
    expect(shouldAutoSwitch({ ...base, autoSwitched: true })).toBe(false)
  })

  it('does NOT auto-switch when viewMode is "create"', () => {
    expect(shouldAutoSwitch({ ...base, viewMode: 'create' })).toBe(false)
  })

  it('does NOT auto-switch when viewMode is "join"', () => {
    expect(shouldAutoSwitch({ ...base, viewMode: 'join' })).toBe(false)
  })

  it('does NOT auto-switch when user has 0 orgs', () => {
    expect(shouldAutoSwitch({ ...base, orgCount: 0 })).toBe(false)
  })

  it('does NOT auto-switch when user has multiple orgs', () => {
    expect(shouldAutoSwitch({ ...base, orgCount: 2 })).toBe(false)
  })

  it('does NOT auto-switch with multiple orgs even without active org', () => {
    expect(
      shouldAutoSwitch({ ...base, orgCount: 3, activeOrg: null }),
    ).toBe(false)
  })
})
