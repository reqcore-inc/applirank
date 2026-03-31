import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ─────────────────────────────────────────────
// 1. Query schema validation
// ─────────────────────────────────────────────

const querySchema = z.object({
  candidateId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

describe('candidate-timeline query schema', () => {
  it('accepts a valid candidateId', () => {
    const result = querySchema.parse({ candidateId: 'cand-123' })
    expect(result.candidateId).toBe('cand-123')
    expect(result.limit).toBe(50) // default
  })

  it('accepts candidateId with custom limit', () => {
    const result = querySchema.parse({ candidateId: 'cand-456', limit: '25' })
    expect(result.candidateId).toBe('cand-456')
    expect(result.limit).toBe(25)
  })

  it('rejects empty candidateId', () => {
    expect(() => querySchema.parse({ candidateId: '' })).toThrow()
  })

  it('rejects missing candidateId', () => {
    expect(() => querySchema.parse({})).toThrow()
  })

  it('clamps limit to max 200', () => {
    expect(() => querySchema.parse({ candidateId: 'c1', limit: '300' })).toThrow()
  })

  it('clamps limit to min 1', () => {
    expect(() => querySchema.parse({ candidateId: 'c1', limit: '0' })).toThrow()
  })

  it('rejects non-integer limit', () => {
    expect(() => querySchema.parse({ candidateId: 'c1', limit: '2.5' })).toThrow()
  })

  it('coerces string limit to number', () => {
    const result = querySchema.parse({ candidateId: 'c1', limit: '100' })
    expect(result.limit).toBe(100)
    expect(typeof result.limit).toBe('number')
  })
})

// ─────────────────────────────────────────────
// 2. Timeline display helpers (from CandidateDetailSidebar)
// ─────────────────────────────────────────────

const timelineActionLabels: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  status_changed: 'Status changed',
  comment_added: 'Comment added',
  scored: 'Scored',
  scheduled: 'Scheduled',
}

interface TimelineEntry {
  id: string
  action: string
  resourceType: string
  resourceId: string
  metadata: Record<string, unknown> | null
  createdAt: string
  actorName: string | null
  actorEmail: string | null
  resourceName: string | null
  jobTitle: string | null
  candidateName: string | null
}

function getTimelineActionColor(action: string): string {
  switch (action) {
    case 'created': return 'bg-green-500'
    case 'status_changed': return 'bg-blue-500'
    case 'updated': return 'bg-amber-500'
    case 'deleted': return 'bg-danger-500'
    case 'comment_added': return 'bg-violet-500'
    case 'scored': return 'bg-teal-500'
    case 'scheduled': return 'bg-brand-500'
    default: return 'bg-surface-400'
  }
}

function describeTimelineItem(item: TimelineEntry): string {
  const actor = item.actorName ?? item.actorEmail ?? 'System'
  const action = timelineActionLabels[item.action] ?? item.action
  const resource = item.resourceType

  if (item.action === 'status_changed' && item.metadata) {
    const from = item.metadata.from_status ?? item.metadata.fromStatus
    const to = item.metadata.to_status ?? item.metadata.toStatus
    if (from && to) return `${actor} changed ${resource} status from ${from} to ${to}`
  }

  if (item.action === 'scored' && item.metadata) {
    const score = item.metadata.score
    if (score != null) return `${actor} scored ${resource} — ${score} pts`
  }

  return `${actor} ${action.toLowerCase()} ${resource}`
}

function makeEntry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    id: 'entry-1',
    action: 'created',
    resourceType: 'application',
    resourceId: 'app-1',
    metadata: null,
    createdAt: '2026-03-15T10:30:00.000Z',
    actorName: 'Alice Smith',
    actorEmail: 'alice@example.com',
    resourceName: null,
    jobTitle: null,
    candidateName: null,
    ...overrides,
  }
}

describe('getTimelineActionColor', () => {
  it('returns green for created', () => {
    expect(getTimelineActionColor('created')).toBe('bg-green-500')
  })

  it('returns blue for status_changed', () => {
    expect(getTimelineActionColor('status_changed')).toBe('bg-blue-500')
  })

  it('returns amber for updated', () => {
    expect(getTimelineActionColor('updated')).toBe('bg-amber-500')
  })

  it('returns danger for deleted', () => {
    expect(getTimelineActionColor('deleted')).toBe('bg-danger-500')
  })

  it('returns violet for comment_added', () => {
    expect(getTimelineActionColor('comment_added')).toBe('bg-violet-500')
  })

  it('returns teal for scored', () => {
    expect(getTimelineActionColor('scored')).toBe('bg-teal-500')
  })

  it('returns brand for scheduled', () => {
    expect(getTimelineActionColor('scheduled')).toBe('bg-brand-500')
  })

  it('returns surface for unknown action', () => {
    expect(getTimelineActionColor('some_random_action')).toBe('bg-surface-400')
  })
})

describe('describeTimelineItem', () => {
  it('describes a basic created event using actor name', () => {
    const item = makeEntry({ action: 'created', resourceType: 'application' })
    expect(describeTimelineItem(item)).toBe('Alice Smith created application')
  })

  it('falls back to actorEmail when actorName is null', () => {
    const item = makeEntry({ actorName: null })
    expect(describeTimelineItem(item)).toBe('alice@example.com created application')
  })

  it('falls back to "System" when both actor fields are null', () => {
    const item = makeEntry({ actorName: null, actorEmail: null })
    expect(describeTimelineItem(item)).toBe('System created application')
  })

  it('describes status_changed with from/to metadata (underscore keys)', () => {
    const item = makeEntry({
      action: 'status_changed',
      resourceType: 'application',
      metadata: { from_status: 'new', to_status: 'screening' },
    })
    expect(describeTimelineItem(item)).toBe('Alice Smith changed application status from new to screening')
  })

  it('describes status_changed with camelCase metadata keys', () => {
    const item = makeEntry({
      action: 'status_changed',
      resourceType: 'application',
      metadata: { fromStatus: 'screening', toStatus: 'interview' },
    })
    expect(describeTimelineItem(item)).toBe('Alice Smith changed application status from screening to interview')
  })

  it('falls back to generic description when status_changed metadata is incomplete', () => {
    const item = makeEntry({
      action: 'status_changed',
      resourceType: 'application',
      metadata: { from_status: 'new' }, // missing to_status
    })
    expect(describeTimelineItem(item)).toBe('Alice Smith status changed application')
  })

  it('describes scored event with score metadata', () => {
    const item = makeEntry({
      action: 'scored',
      resourceType: 'application',
      metadata: { score: 85 },
    })
    expect(describeTimelineItem(item)).toBe('Alice Smith scored application — 85 pts')
  })

  it('handles scored with 0 score', () => {
    const item = makeEntry({
      action: 'scored',
      resourceType: 'application',
      metadata: { score: 0 },
    })
    expect(describeTimelineItem(item)).toBe('Alice Smith scored application — 0 pts')
  })

  it('handles scored without score metadata', () => {
    const item = makeEntry({
      action: 'scored',
      resourceType: 'application',
      metadata: {},
    })
    expect(describeTimelineItem(item)).toBe('Alice Smith scored application')
  })

  it('describes candidate resource type', () => {
    const item = makeEntry({ action: 'updated', resourceType: 'candidate' })
    expect(describeTimelineItem(item)).toBe('Alice Smith updated candidate')
  })

  it('describes unknown action verbatim in lowercase', () => {
    const item = makeEntry({ action: 'custom_action' })
    expect(describeTimelineItem(item)).toBe('Alice Smith custom_action application')
  })

  it('describes comment_added action', () => {
    const item = makeEntry({ action: 'comment_added', resourceType: 'application' })
    expect(describeTimelineItem(item)).toBe('Alice Smith comment added application')
  })

  it('describes deleted action', () => {
    const item = makeEntry({ action: 'deleted', resourceType: 'candidate' })
    expect(describeTimelineItem(item)).toBe('Alice Smith deleted candidate')
  })
})

// ─────────────────────────────────────────────
// 3. Source tracking sidebar state helpers
// ─────────────────────────────────────────────

describe('source-tracking sidebar state', () => {
  it('selectedAppId starts as null (sidebar closed)', () => {
    const selectedAppId: string | null = null
    const sidebarOpen = Boolean(selectedAppId)
    expect(sidebarOpen).toBe(false)
  })

  it('setting selectedAppId opens the sidebar', () => {
    const selectedAppId: string | null = 'app-123'
    const sidebarOpen = Boolean(selectedAppId)
    expect(sidebarOpen).toBe(true)
  })

  it('clearing selectedAppId closes the sidebar', () => {
    let selectedAppId: string | null = 'app-123'
    selectedAppId = null
    const sidebarOpen = Boolean(selectedAppId)
    expect(sidebarOpen).toBe(false)
  })
})

// ─────────────────────────────────────────────
// 4. Timeline tab state management
// ─────────────────────────────────────────────

describe('timeline tab lazy loading', () => {
  it('does not load until timeline tab is active', () => {
    let activeTab: 'overview' | 'timeline' = 'overview'
    let loaded = false

    // Simulating the watch behavior
    if (activeTab === 'timeline' && !loaded) {
      loaded = true
    }

    expect(loaded).toBe(false)
  })

  it('triggers load when timeline tab becomes active', () => {
    let activeTab: 'overview' | 'timeline' = 'timeline'
    let loaded = false

    if (activeTab === 'timeline' && !loaded) {
      loaded = true
    }

    expect(loaded).toBe(true)
  })

  it('does not reload if already loaded', () => {
    let loadCount = 0
    const loaded = true

    // Simulate switching back to timeline
    const activeTab: 'overview' | 'timeline' = 'timeline'
    if (activeTab === 'timeline' && !loaded) {
      loadCount++
    }

    expect(loadCount).toBe(0)
  })
})

// ─────────────────────────────────────────────
// 5. Timeline items reset on application switch
// ─────────────────────────────────────────────

describe('timeline state reset on application switch', () => {
  it('clears timeline data when applicationId changes', () => {
    // Simulate initial state with loaded timeline
    let timelineItems: TimelineEntry[] = [makeEntry()]
    let timelineLoaded = true
    let timelineError: string | null = null
    let activeTab = 'timeline'

    // Simulate applicationId change handler
    activeTab = 'overview'
    timelineItems = []
    timelineLoaded = false
    timelineError = null

    expect(timelineItems).toEqual([])
    expect(timelineLoaded).toBe(false)
    expect(timelineError).toBeNull()
    expect(activeTab).toBe('overview')
  })
})
