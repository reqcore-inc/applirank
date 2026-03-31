/**
 * Composable for source tracking analytics and tracking link management.
 * Provides data for the source tracking dashboard and link CRUD operations.
 */

interface TrackingLink {
  id: string
  jobId: string | null
  jobTitle: string | null
  channel: string
  name: string
  code: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  clickCount: number
  applicationCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface SourceStats {
  channelBreakdown: { channel: string; count: number }[]
  topLinks: {
    id: string
    name: string
    channel: string
    code: string
    jobTitle: string | null
    clickCount: number
    applicationCount: number
    isActive: boolean
  }[]
  funnel: Record<string, Record<string, number>>
  dailyTrend: { date: string; channel: string; count: number }[]
  recentAttributed: {
    applicationId: string
    channel: string
    utmSource: string | null
    utmCampaign: string | null
    referrerDomain: string | null
    trackingLinkName: string | null
    candidateFirstName: string
    candidateLastName: string
    candidateEmail: string
    jobTitle: string
    status: string
    appliedAt: string
  }[]
  topReferrerDomains: { domain: string | null; count: number }[]
  summary: {
    totalTracked: number
    totalUntracked: number
    attributionRate: number
  }
}

export function useSourceTracking(options?: {
  jobId?: Ref<string | undefined> | string
  from?: Ref<string | undefined> | string
  to?: Ref<string | undefined> | string
}) {
  const jobId = computed(() => toValue(options?.jobId))
  const from = computed(() => toValue(options?.from))
  const to = computed(() => toValue(options?.to))

  // ─── Source stats ─────────────────────────
  const queryParams = computed(() => {
    const q: Record<string, string> = {}
    if (jobId.value) q.jobId = jobId.value
    if (from.value) q.from = from.value
    if (to.value) q.to = to.value
    return q
  })

  const {
    data: stats,
    status: statsStatus,
    error: statsError,
    refresh: refreshStats,
  } = useFetch<SourceStats>('/api/source-tracking/stats', {
    headers: useRequestHeaders(['cookie']),
    query: queryParams,
    watch: [queryParams],
  })

  const channelBreakdown = computed(() => stats.value?.channelBreakdown ?? [])
  const topLinks = computed(() => stats.value?.topLinks ?? [])
  const funnel = computed(() => stats.value?.funnel ?? {})
  const dailyTrend = computed(() => stats.value?.dailyTrend ?? [])
  const recentAttributed = computed(() => stats.value?.recentAttributed ?? [])
  const topReferrerDomains = computed(() => stats.value?.topReferrerDomains ?? [])
  const summary = computed(() => stats.value?.summary ?? { totalTracked: 0, totalUntracked: 0, attributionRate: 0 })

  return {
    channelBreakdown,
    topLinks,
    funnel,
    dailyTrend,
    recentAttributed,
    topReferrerDomains,
    summary,
    statsStatus,
    statsError,
    refreshStats,
  }
}

/**
 * Composable for managing tracking links (CRUD operations).
 */
export function useTrackingLinks(options?: {
  jobId?: Ref<string | undefined> | string
  channel?: Ref<string | undefined> | string
}) {
  const toast = useToast()

  const jobId = computed(() => toValue(options?.jobId))
  const channel = computed(() => toValue(options?.channel))

  const {
    data,
    status: fetchStatus,
    error,
    refresh,
  } = useFetch<{ data: TrackingLink[]; total: number }>('/api/tracking-links', {
    key: 'tracking-links',
    headers: useRequestHeaders(['cookie']),
    query: computed(() => {
      const q: Record<string, string> = {}
      if (jobId.value) q.jobId = jobId.value
      if (channel.value) q.channel = channel.value
      return q
    }),
  })

  const links = computed<TrackingLink[]>(() => data.value?.data ?? [])
  const total = computed(() => data.value?.total ?? 0)

  async function createLink(payload: {
    jobId?: string
    channel?: string
    name: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    utmTerm?: string
    utmContent?: string
  }) {
    const created = await $fetch('/api/tracking-links', {
      method: 'POST',
      body: payload,
    })
    await refresh()
    toast.success('Tracking link created')
    return created
  }

  async function updateLink(id: string, payload: {
    name?: string
    channel?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    utmTerm?: string
    utmContent?: string
    isActive?: boolean
  }) {
    const updated = await $fetch(`/api/tracking-links/${id}`, {
      method: 'PATCH',
      body: payload,
    })
    await refresh()
    return updated
  }

  async function deleteLink(id: string) {
    await $fetch(`/api/tracking-links/${id}`, { method: 'DELETE' })
    await refresh()
    toast.success('Tracking link deleted')
  }

  async function toggleLink(id: string, isActive: boolean) {
    await updateLink(id, { isActive })
    toast.success(isActive ? 'Link activated' : 'Link deactivated')
  }

  return {
    links,
    total,
    fetchStatus,
    error,
    refresh,
    createLink,
    updateLink,
    deleteLink,
    toggleLink,
  }
}
