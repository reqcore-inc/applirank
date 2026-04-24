<script setup lang="ts">
import {
  ArrowLeft, Link2, Globe, BarChart3, Users,
  MousePointerClick, Target, Activity, TrendingUp,
  CheckCircle2, XCircle, Copy, Clock,
  ExternalLink, AlertCircle, CalendarDays,
  Hash, Tag, Layers, Pencil, X, ChevronDown,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const localePath = useLocalePath()
const toast = useToast()
const { track } = useTrack()
const { formatPersonName } = useOrgSettings()

const linkId = computed(() => route.params.id as string)

useSeoMeta({
  title: 'Link Details — Source Tracking — Reqcore',
  description: 'Detailed analytics for a tracking link',
})

onMounted(() => track('source_tracking_link_detail_viewed', { linkId: linkId.value }))

// ─────────────────────────────────────────────
// Date range
// ─────────────────────────────────────────────

const dateRange = ref<'7d' | '30d' | '90d' | 'all'>('30d')

const dateFrom = computed(() => {
  if (dateRange.value === 'all') return undefined
  const d = new Date()
  const days = { '7d': 7, '30d': 30, '90d': 90 }[dateRange.value]
  d.setDate(d.getDate() - days)
  return d.toISOString()
})

// ─────────────────────────────────────────────
// Fetch data
// ─────────────────────────────────────────────

const {
  data: detail,
  status: fetchStatus,
  error: fetchError,
  refresh,
} = useFetch(() => `/api/tracking-links/${linkId.value}/stats`, {
  key: `tracking-link-detail-${linkId.value}`,
  headers: useRequestHeaders(['cookie']),
  query: computed(() => {
    const q: Record<string, string> = {}
    if (dateFrom.value) q.from = dateFrom.value
    return q
  }),
})

const link = computed(() => detail.value?.link)
const funnel = computed(() => detail.value?.funnel ?? { new: 0, screening: 0, interview: 0, offer: 0, hired: 0, rejected: 0 })
const dailyTrend = computed(() => detail.value?.dailyTrend ?? [])
const applications = computed(() => detail.value?.attributedApplications ?? [])
const referrerDomains = computed(() => detail.value?.referrerDomains ?? [])
const totalAttributed = computed(() => detail.value?.totalAttributed ?? 0)

// ─────────────────────────────────────────────
// Build tracking URL
// ─────────────────────────────────────────────

const requestUrl = useRequestURL()
function buildTrackingUrl(code: string): string {
  const base = `${requestUrl.protocol}//${requestUrl.host}`
  return `${base}/api/public/track/${encodeURIComponent(code)}`
}

const copied = ref(false)
async function copyTrackingUrl() {
  if (!link.value) return
  try {
    await navigator.clipboard.writeText(buildTrackingUrl(link.value.code))
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    toast.info(buildTrackingUrl(link.value.code))
  }
}

// ─────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────

const channelLabels: Record<string, string> = {
  linkedin: 'LinkedIn', indeed: 'Indeed', glassdoor: 'Glassdoor',
  ziprecruiter: 'ZipRecruiter', monster: 'Monster', handshake: 'Handshake',
  angellist: 'AngelList', wellfound: 'Wellfound', dice: 'Dice',
  stackoverflow: 'Stack Overflow', weworkremotely: 'We Work Remotely',
  remoteok: 'Remote OK', builtin: 'Built In', hired: 'Hired',
  lever: 'Lever', greenhouse_board: 'Greenhouse', google_jobs: 'Google Jobs',
  facebook: 'Facebook', twitter: 'X / Twitter', instagram: 'Instagram',
  tiktok: 'TikTok', reddit: 'Reddit', referral: 'Referral',
  career_site: 'Career Site', email: 'Email', event: 'Event',
  agency: 'Agency', direct: 'Direct', other: 'Other', custom: 'Custom',
}

const channelColors: Record<string, string> = {
  linkedin: 'bg-blue-500', indeed: 'bg-indigo-500', glassdoor: 'bg-emerald-500',
  ziprecruiter: 'bg-green-600', monster: 'bg-violet-500', google_jobs: 'bg-red-500',
  facebook: 'bg-blue-600', twitter: 'bg-surface-700 dark:bg-surface-300',
  instagram: 'bg-pink-500', tiktok: 'bg-surface-900 dark:bg-surface-100',
  reddit: 'bg-orange-500', referral: 'bg-amber-500', career_site: 'bg-brand-500',
  email: 'bg-teal-500', direct: 'bg-surface-400', other: 'bg-surface-300 dark:bg-surface-600',
  custom: 'bg-brand-400', event: 'bg-cyan-500', agency: 'bg-rose-500',
}

const channelBadgeClasses: Record<string, string> = {
  linkedin: 'bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-800/40',
  indeed: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60 dark:bg-indigo-950 dark:text-indigo-400 dark:ring-indigo-800/40',
  glassdoor: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-800/40',
  referral: 'bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-800/40',
  direct: 'bg-surface-100 text-surface-600 ring-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:ring-surface-700',
  career_site: 'bg-brand-50 text-brand-700 ring-brand-200/60 dark:bg-brand-950 dark:text-brand-400 dark:ring-brand-800/40',
  email: 'bg-teal-50 text-teal-700 ring-teal-200/60 dark:bg-teal-950 dark:text-teal-400 dark:ring-teal-800/40',
}

const statusBadgeClasses: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-800/40',
  screening: 'bg-violet-50 text-violet-700 ring-violet-200/60 dark:bg-violet-950 dark:text-violet-400 dark:ring-violet-800/40',
  interview: 'bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-800/40',
  offer: 'bg-teal-50 text-teal-700 ring-teal-200/60 dark:bg-teal-950 dark:text-teal-400 dark:ring-teal-800/40',
  hired: 'bg-green-50 text-green-700 ring-green-200/60 dark:bg-green-950 dark:text-green-400 dark:ring-green-800/40',
  rejected: 'bg-surface-100 text-surface-600 ring-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:ring-surface-700',
}

function getChannelBadge(channel: string) {
  return channelBadgeClasses[channel] ?? 'bg-surface-100 text-surface-600 ring-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:ring-surface-700'
}

function getChannelColor(channel: string) {
  return channelColors[channel] ?? 'bg-surface-400 dark:bg-surface-500'
}

function getChannelLabel(channel: string) {
  return channelLabels[channel] ?? channel
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// ─────────────────────────────────────────────
// Funnel computed
// ─────────────────────────────────────────────

const funnelTotal = computed(() =>
  Object.values(funnel.value).reduce((s, v) => s + v, 0),
)

const funnelStages = computed(() => {
  const stages = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const
  return stages.map((stage) => ({
    stage,
    count: funnel.value[stage] ?? 0,
    pct: funnelTotal.value > 0 ? Math.round(((funnel.value[stage] ?? 0) / funnelTotal.value) * 100) : 0,
  }))
})

const hireRate = computed(() => {
  if (funnelTotal.value === 0) return 0
  return Math.round(((funnel.value.hired ?? 0) / funnelTotal.value) * 100)
})

// ─────────────────────────────────────────────
// Trend chart helpers (simple bar chart)
// ─────────────────────────────────────────────

const maxTrendCount = computed(() =>
  Math.max(...dailyTrend.value.map((d) => d.count), 1),
)

// ─────────────────────────────────────────────
// UTM summary
// ─────────────────────────────────────────────

const utmParams = computed(() => {
  if (!link.value) return []
  const params: { label: string; value: string }[] = []
  if (link.value.utmSource) params.push({ label: 'Source', value: link.value.utmSource })
  if (link.value.utmMedium) params.push({ label: 'Medium', value: link.value.utmMedium })
  if (link.value.utmCampaign) params.push({ label: 'Campaign', value: link.value.utmCampaign })
  if (link.value.utmTerm) params.push({ label: 'Term', value: link.value.utmTerm })
  if (link.value.utmContent) params.push({ label: 'Content', value: link.value.utmContent })
  return params
})

// ─────────────────────────────────────────────
// Edit link
// ─────────────────────────────────────────────

const showEditModal = ref(false)
const isSaving = ref(false)
const editForm = ref({
  name: '',
  channel: '' as string,
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmTerm: '',
  utmContent: '',
})

function openEditModal() {
  if (!link.value) return
  editForm.value = {
    name: link.value.name,
    channel: link.value.channel,
    utmSource: link.value.utmSource ?? '',
    utmMedium: link.value.utmMedium ?? '',
    utmCampaign: link.value.utmCampaign ?? '',
    utmTerm: link.value.utmTerm ?? '',
    utmContent: link.value.utmContent ?? '',
  }
  showEditModal.value = true
}

async function handleSaveEdit() {
  if (!editForm.value.name.trim()) return
  isSaving.value = true
  try {
    await $fetch(`/api/tracking-links/${linkId.value}`, {
      method: 'PATCH',
      body: {
        name: editForm.value.name.trim(),
        channel: editForm.value.channel,
        utmSource: editForm.value.utmSource || undefined,
        utmMedium: editForm.value.utmMedium || undefined,
        utmCampaign: editForm.value.utmCampaign || undefined,
        utmTerm: editForm.value.utmTerm || undefined,
        utmContent: editForm.value.utmContent || undefined,
      },
    })
    showEditModal.value = false
    toast.success('Link updated')
    await refresh()
  } catch (err: any) {
    toast.error(err?.data?.statusMessage ?? 'Failed to update link')
  } finally {
    isSaving.value = false
  }
}

// ─────────────────────────────────────────────
// Candidate detail sidebar
// ─────────────────────────────────────────────

const selectedAppId = ref<string | null>(null)
const sidebarOpen = computed(() => Boolean(selectedAppId.value))

function selectApplication(appId: string) {
  selectedAppId.value = appId
  track('source_tracking_candidate_opened', { linkId: linkId.value, applicationId: appId })
}

function closeSidebar() {
  selectedAppId.value = null
}

async function handleSidebarUpdated() {
  await refresh()
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <!-- ─── Loading skeleton ─── -->
    <div v-if="fetchStatus === 'pending'">
      <div class="mb-8">
        <div class="h-4 w-32 bg-surface-200 dark:bg-surface-700 rounded animate-pulse mb-4" />
        <div class="h-8 w-64 bg-surface-200 dark:bg-surface-700 rounded-lg animate-pulse mb-2" />
        <div class="h-4 w-48 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div v-for="i in 4" :key="i" class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 animate-pulse">
          <div class="h-4 w-20 bg-surface-200 dark:bg-surface-700 rounded mb-4" />
          <div class="h-9 w-14 bg-surface-200 dark:bg-surface-700 rounded" />
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 animate-pulse">
          <div class="h-5 w-40 bg-surface-200 dark:bg-surface-700 rounded mb-6" />
          <div class="space-y-4">
            <div v-for="i in 5" :key="i" class="h-10 bg-surface-100 dark:bg-surface-800 rounded-xl" />
          </div>
        </div>
        <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 animate-pulse">
          <div class="h-5 w-32 bg-surface-200 dark:bg-surface-700 rounded mb-6" />
          <div class="space-y-3">
            <div v-for="i in 4" :key="i" class="h-14 bg-surface-100 dark:bg-surface-800 rounded-xl" />
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Error ─── -->
    <div
      v-else-if="fetchError"
      class="rounded-2xl border border-danger-200 dark:border-danger-900 bg-danger-50 dark:bg-danger-950/60 p-5 text-sm text-danger-700 dark:text-danger-400 flex items-center gap-3"
    >
      <AlertCircle class="size-5 shrink-0" />
      <span>{{ fetchError?.statusCode === 404 ? 'Tracking link not found.' : 'Failed to load link details.' }}</span>
      <NuxtLink
        :to="localePath('/dashboard/source-tracking')"
        class="underline ml-auto font-medium"
      >
        Back to Source Tracking
      </NuxtLink>
    </div>

    <!-- ─── Main content ─── -->
    <template v-else-if="link">
      <!-- ─── Back + Header ─── -->
      <div class="mb-6 sm:mb-8">
        <NuxtLink
          :to="localePath('/dashboard/source-tracking')"
          class="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors mb-4"
        >
          <ArrowLeft class="size-4" />
          Back to Source Tracking
        </NuxtLink>

        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
                {{ link.name }}
              </h1>
              <span
                class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset"
                :class="getChannelBadge(link.channel)"
              >
                {{ getChannelLabel(link.channel) }}
              </span>
              <span
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset"
                :class="link.isActive
                  ? 'bg-green-50 text-green-700 ring-green-200/60 dark:bg-green-950 dark:text-green-400 dark:ring-green-800/40'
                  : 'bg-surface-100 text-surface-500 ring-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:ring-surface-700'"
              >
                <CheckCircle2 v-if="link.isActive" class="size-3" />
                <XCircle v-else class="size-3" />
                {{ link.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-400 dark:text-surface-500">
              <span v-if="link.jobTitle" class="inline-flex items-center gap-1">
                <Layers class="size-3.5" />
                {{ link.jobTitle }}
              </span>
              <span v-else class="inline-flex items-center gap-1">
                <Layers class="size-3.5" />
                All jobs
              </span>
              <span class="inline-flex items-center gap-1">
                <CalendarDays class="size-3.5" />
                Created {{ formatFullDate(link.createdAt) }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Date range pill -->
            <div class="inline-flex rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-0.5">
              <button
                v-for="range in (['7d', '30d', '90d', 'all'] as const)"
                :key="range"
                class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                :class="dateRange === range
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'"
                @click="dateRange = range"
              >
                {{ range === 'all' ? 'All time' : range.toUpperCase() }}
              </button>
            </div>

            <!-- Edit -->
            <button
              class="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              @click="openEditModal"
            >
              <Pencil class="size-3.5" />
              Edit
            </button>

            <!-- Copy URL -->
            <button
              class="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              @click="copyTrackingUrl"
            >
              <Copy v-if="!copied" class="size-3.5" />
              <CheckCircle2 v-else class="size-3.5 text-green-500" />
              {{ copied ? 'Copied!' : 'Copy URL' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ─── Tracking URL display ─── -->
      <div class="mb-6 sm:mb-8 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 px-4 py-3 flex items-center gap-3">
        <Link2 class="size-4 text-surface-400 shrink-0" />
        <code class="text-xs text-surface-600 dark:text-surface-300 font-mono truncate flex-1">
          {{ buildTrackingUrl(link.code) }}
        </code>
        <button
          class="shrink-0 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
          @click="copyTrackingUrl"
        >
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>

      <!-- ─── Stat cards ─── -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <!-- Clicks -->
        <div class="group relative rounded-2xl bg-white dark:bg-surface-900 p-5 sm:p-6 overflow-hidden isolate ring-1 ring-surface-950/[0.04] dark:ring-white/[0.06] hover:ring-blue-500/25 dark:hover:ring-blue-400/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/[0.08]">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <MousePointerClick class="absolute -bottom-3 -right-3 size-24 text-blue-500/[0.03] dark:text-blue-400/[0.05] rotate-12 transition-transform duration-700 ease-out group-hover:rotate-3 group-hover:scale-110 pointer-events-none" />
          <div class="relative">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black tracking-tight text-surface-900 dark:text-surface-50 tabular-nums leading-none transition-colors duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {{ link.clickCount }}
              </span>
              <span class="size-1.5 rounded-full bg-blue-500 shrink-0 mb-1" />
            </div>
            <span class="block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500">Clicks</span>
            <p class="text-[11px] text-surface-300 dark:text-surface-600 mt-1">Total clicks</p>
          </div>
        </div>

        <!-- Applications -->
        <div class="group relative rounded-2xl bg-white dark:bg-surface-900 p-5 sm:p-6 overflow-hidden isolate ring-1 ring-surface-950/[0.04] dark:ring-white/[0.06] hover:ring-brand-500/25 dark:hover:ring-brand-400/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/[0.08]">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Users class="absolute -bottom-3 -right-3 size-24 text-brand-500/[0.03] dark:text-brand-400/[0.05] rotate-12 transition-transform duration-700 ease-out group-hover:rotate-3 group-hover:scale-110 pointer-events-none" />
          <div class="relative">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black tracking-tight text-surface-900 dark:text-surface-50 tabular-nums leading-none transition-colors duration-300 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                {{ link.applicationCount }}
              </span>
              <span class="size-1.5 rounded-full bg-brand-500 shrink-0 mb-1" />
            </div>
            <span class="block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500">Applications</span>
            <p class="text-[11px] text-surface-300 dark:text-surface-600 mt-1">Total attributed</p>
          </div>
        </div>

        <!-- CVR -->
        <div class="group relative rounded-2xl bg-white dark:bg-surface-900 p-5 sm:p-6 overflow-hidden isolate ring-1 ring-surface-950/[0.04] dark:ring-white/[0.06] hover:ring-teal-500/25 dark:hover:ring-teal-400/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/[0.08]">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Target class="absolute -bottom-3 -right-3 size-24 text-teal-500/[0.03] dark:text-teal-400/[0.05] rotate-12 transition-transform duration-700 ease-out group-hover:rotate-3 group-hover:scale-110 pointer-events-none" />
          <div class="relative">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black tracking-tight tabular-nums leading-none transition-colors duration-300" :class="link.cvr > 0 ? 'text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300' : 'text-surface-900 dark:text-surface-50 group-hover:text-teal-600 dark:group-hover:text-teal-400'">
                {{ link.cvr }}%
              </span>
              <span class="size-1.5 rounded-full bg-teal-500 shrink-0 mb-1" />
            </div>
            <span class="block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500">CVR</span>
            <p class="text-[11px] text-surface-300 dark:text-surface-600 mt-1">Click → Application</p>
          </div>
        </div>

        <!-- Hire Rate -->
        <div class="group relative rounded-2xl bg-white dark:bg-surface-900 p-5 sm:p-6 overflow-hidden isolate ring-1 ring-surface-950/[0.04] dark:ring-white/[0.06] hover:ring-green-500/25 dark:hover:ring-green-400/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/[0.08]">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CheckCircle2 class="absolute -bottom-3 -right-3 size-24 text-green-500/[0.03] dark:text-green-400/[0.05] rotate-12 transition-transform duration-700 ease-out group-hover:rotate-3 group-hover:scale-110 pointer-events-none" />
          <div class="relative">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black tracking-tight tabular-nums leading-none transition-colors duration-300" :class="hireRate > 0 ? 'text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300' : 'text-surface-900 dark:text-surface-50 group-hover:text-green-600 dark:group-hover:text-green-400'">
                {{ hireRate }}%
              </span>
              <span class="size-1.5 rounded-full bg-green-500 shrink-0 mb-1" />
            </div>
            <span class="block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500">Hire Rate</span>
            <p class="text-[11px] text-surface-300 dark:text-surface-600 mt-1">Application → Hired</p>
          </div>
        </div>

        <!-- Attributed -->
        <div class="group relative rounded-2xl bg-white dark:bg-surface-900 p-5 sm:p-6 overflow-hidden isolate ring-1 ring-surface-950/[0.04] dark:ring-white/[0.06] hover:ring-violet-500/25 dark:hover:ring-violet-400/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/[0.08]">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Activity class="absolute -bottom-3 -right-3 size-24 text-violet-500/[0.03] dark:text-violet-400/[0.05] rotate-12 transition-transform duration-700 ease-out group-hover:rotate-3 group-hover:scale-110 pointer-events-none" />
          <div class="relative">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black tracking-tight text-surface-900 dark:text-surface-50 tabular-nums leading-none transition-colors duration-300 group-hover:text-violet-600 dark:group-hover:text-violet-400">
                {{ totalAttributed }}
              </span>
              <span class="size-1.5 rounded-full bg-violet-500 shrink-0 mb-1" />
            </div>
            <span class="block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500">Attributed</span>
            <p class="text-[11px] text-surface-300 dark:text-surface-600 mt-1">All time</p>
          </div>
        </div>
      </div>

      <!-- ─── Main layout ─── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- ─── Left: Pipeline funnel ─── -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Pipeline funnel -->
          <div class="rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-xs dark:shadow-none">
            <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800">
              <div class="flex items-center gap-2.5">
                <div class="flex items-center justify-center size-7 rounded-lg bg-surface-100 dark:bg-surface-800">
                  <TrendingUp class="size-3.5 text-surface-500 dark:text-surface-400" />
                </div>
                <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Application Pipeline</h2>
              </div>
              <span class="text-xs text-surface-400 tabular-nums font-medium">{{ funnelTotal }} total</span>
            </div>

            <div v-if="funnelTotal === 0" class="px-6 py-12 text-center">
              <div class="mx-auto mb-4 flex items-center justify-center size-12 rounded-2xl bg-surface-100 dark:bg-surface-800">
                <TrendingUp class="size-5 text-surface-400 dark:text-surface-500" />
              </div>
              <p class="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">No applications yet</p>
              <p class="text-xs text-surface-400 dark:text-surface-500">Applications from this link will appear here.</p>
            </div>

            <div v-else class="px-6 py-5 space-y-4">
              <div v-for="s in funnelStages" :key="s.stage">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-sm font-medium text-surface-700 dark:text-surface-200 capitalize">{{ s.stage }}</span>
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-surface-400 tabular-nums">{{ s.pct }}%</span>
                    <span class="text-sm font-bold text-surface-900 dark:text-surface-100 tabular-nums w-8 text-right">{{ s.count }}</span>
                  </div>
                </div>
                <div class="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700 ease-out"
                    :class="{
                      'bg-blue-500': s.stage === 'new',
                      'bg-violet-500': s.stage === 'screening',
                      'bg-amber-500': s.stage === 'interview',
                      'bg-teal-500': s.stage === 'offer',
                      'bg-green-500': s.stage === 'hired',
                      'bg-surface-400 dark:bg-surface-500': s.stage === 'rejected',
                    }"
                    :style="{ width: `${s.pct}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── Right: UTM params + Referrers ─── -->
        <div class="space-y-6">
          <!-- UTM Parameters -->
          <div class="rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-xs dark:shadow-none">
            <div class="flex items-center gap-2.5 px-5 py-4 border-b border-surface-100 dark:border-surface-800">
              <div class="flex items-center justify-center size-7 rounded-lg bg-surface-100 dark:bg-surface-800">
                <Tag class="size-3.5 text-surface-500 dark:text-surface-400" />
              </div>
              <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Link Configuration</h2>
            </div>

            <div class="px-5 py-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-surface-500 dark:text-surface-400">Channel</span>
                <span class="inline-flex items-center gap-1.5 text-sm font-medium text-surface-800 dark:text-surface-200">
                  <span class="size-2 rounded-full" :class="getChannelColor(link.channel)" />
                  {{ getChannelLabel(link.channel) }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-surface-500 dark:text-surface-400">Code</span>
                <code class="text-xs font-mono text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded">{{ link.code }}</code>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-surface-500 dark:text-surface-400">Job Scope</span>
                <span class="text-sm text-surface-700 dark:text-surface-300">{{ link.jobTitle ?? 'All jobs' }}</span>
              </div>

              <template v-if="utmParams.length > 0">
                <div class="border-t border-surface-100 dark:border-surface-800 pt-3 mt-3">
                  <span class="text-[10px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2 block">UTM Parameters</span>
                  <div class="space-y-2">
                    <div v-for="p in utmParams" :key="p.label" class="flex items-center justify-between">
                      <span class="text-xs text-surface-500 dark:text-surface-400">{{ p.label }}</span>
                      <code class="text-xs font-mono text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded truncate max-w-[140px]">{{ p.value }}</code>
                    </div>
                  </div>
                </div>
              </template>

              <div v-else class="border-t border-surface-100 dark:border-surface-800 pt-3 mt-3">
                <p class="text-xs text-surface-400 dark:text-surface-500 text-center">No UTM parameters configured</p>
              </div>
            </div>
          </div>

          <!-- Referrer domains -->
          <div class="rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-xs dark:shadow-none">
            <div class="flex items-center gap-2.5 px-5 py-4 border-b border-surface-100 dark:border-surface-800">
              <div class="flex items-center justify-center size-7 rounded-lg bg-surface-100 dark:bg-surface-800">
                <Globe class="size-3.5 text-surface-500 dark:text-surface-400" />
              </div>
              <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Referrer Domains</h2>
            </div>

            <div v-if="referrerDomains.length === 0" class="px-5 py-10 text-center">
              <div class="mx-auto mb-3 flex items-center justify-center size-10 rounded-2xl bg-surface-100 dark:bg-surface-800">
                <Globe class="size-4 text-surface-400 dark:text-surface-500" />
              </div>
              <p class="text-xs font-medium text-surface-500 dark:text-surface-400">No referrer data</p>
            </div>

            <div v-else class="px-5 py-4 space-y-3">
              <div
                v-for="ref in referrerDomains"
                :key="ref.domain ?? 'unknown'"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="size-5 rounded bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                    <Globe class="size-3 text-surface-400" />
                  </div>
                  <span class="text-sm text-surface-700 dark:text-surface-300 truncate">{{ ref.domain ?? 'Unknown' }}</span>
                </div>
                <span class="text-sm font-bold text-surface-900 dark:text-surface-100 tabular-nums shrink-0 ml-2">{{ ref.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Applications Over Time (full width) ─── -->
      <div class="mb-6 rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-xs dark:shadow-none">
        <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center size-7 rounded-lg bg-surface-100 dark:bg-surface-800">
              <BarChart3 class="size-3.5 text-surface-500 dark:text-surface-400" />
            </div>
            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Applications Over Time</h2>
          </div>
        </div>

        <div v-if="dailyTrend.length === 0" class="px-6 py-12 text-center">
          <div class="mx-auto mb-4 flex items-center justify-center size-12 rounded-2xl bg-surface-100 dark:bg-surface-800">
            <BarChart3 class="size-5 text-surface-400 dark:text-surface-500" />
          </div>
          <p class="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">No trend data yet</p>
          <p class="text-xs text-surface-400 dark:text-surface-500">Daily application counts will appear here.</p>
        </div>

        <div v-else class="px-6 py-5">
          <div class="flex items-end gap-1 h-40">
            <div
              v-for="day in dailyTrend"
              :key="day.date"
              class="flex-1 flex flex-col items-center justify-end gap-1 group"
            >
              <span class="text-[10px] font-bold text-surface-600 dark:text-surface-300 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                {{ day.count }}
              </span>
              <div
                class="w-full rounded-t-md bg-brand-500 dark:bg-brand-400 transition-all duration-300 min-h-[2px] group-hover:bg-brand-600 dark:group-hover:bg-brand-300"
                :style="{ height: `${Math.max((day.count / maxTrendCount) * 100, 2)}%` }"
              />
            </div>
          </div>
          <div class="flex justify-between mt-2 text-[10px] text-surface-400 tabular-nums">
            <span>{{ dailyTrend[0]?.date ? new Date(dailyTrend[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '' }}</span>
            <span>{{ dailyTrend[dailyTrend.length - 1]?.date ? new Date(dailyTrend[dailyTrend.length - 1]!.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '' }}</span>
          </div>
        </div>
      </div>

      <!-- ─── Attributed Applications Table ─── -->
      <div class="rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-xs dark:shadow-none">
        <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center justify-center size-7 rounded-lg bg-surface-100 dark:bg-surface-800">
              <Users class="size-3.5 text-surface-500 dark:text-surface-400" />
            </div>
            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Attributed Applications</h2>
          </div>
          <span class="text-xs text-surface-400 tabular-nums font-medium">{{ applications.length }} shown</span>
        </div>

        <div v-if="applications.length === 0" class="px-6 py-12 text-center">
          <div class="mx-auto mb-4 flex items-center justify-center size-12 rounded-2xl bg-surface-100 dark:bg-surface-800">
            <Users class="size-5 text-surface-400 dark:text-surface-500" />
          </div>
          <p class="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">No applications attributed</p>
          <p class="text-xs text-surface-400 dark:text-surface-500 max-w-sm mx-auto">
            Applications that come through this tracking link will be listed here.
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30">
                <th class="px-5 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Candidate</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Job</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Referrer</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Campaign</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Applied</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
              <tr
                v-for="app in applications"
                :key="app.applicationId"
                class="cursor-pointer transition-all duration-150"
                :class="selectedAppId === app.applicationId
                  ? 'bg-brand-50/70 dark:bg-brand-950/20'
                  : 'hover:bg-surface-50 dark:hover:bg-surface-800/40'"
                @click="selectApplication(app.applicationId)"
              >
                <!-- Candidate -->
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-2.5">
                    <div class="flex items-center justify-center size-8 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/80 dark:to-brand-800/80 shrink-0 ring-1 ring-brand-200/50 dark:ring-brand-800/50">
                      <span class="text-[10px] font-bold text-brand-700 dark:text-brand-300">
                        {{ ((app.candidateFirstName?.[0] ?? '') + (app.candidateLastName?.[0] ?? '')).toUpperCase() }}
                      </span>
                    </div>
                    <div class="min-w-0">
                      <NuxtLink
                        :to="localePath(`/dashboard/applications/${app.applicationId}`)"
                        class="text-sm font-medium text-surface-800 dark:text-surface-200 hover:text-brand-600 dark:hover:text-brand-400 truncate no-underline transition-colors block"
                        @click.stop
                      >
                        {{ formatPersonName(app.candidateFirstName, app.candidateLastName) }}
                      </NuxtLink>
                      <div class="text-[11px] text-surface-400 truncate">{{ app.candidateEmail }}</div>
                    </div>
                  </div>
                </td>
                <!-- Job -->
                <td class="px-4 py-3.5 text-surface-600 dark:text-surface-300 truncate max-w-[150px]">
                  {{ app.jobTitle }}
                </td>
                <!-- Referrer -->
                <td class="px-4 py-3.5 text-xs text-surface-500 dark:text-surface-400 truncate max-w-[120px]">
                  {{ app.referrerDomain ?? '—' }}
                </td>
                <!-- Campaign -->
                <td class="px-4 py-3.5 text-xs text-surface-500 dark:text-surface-400 truncate max-w-[120px]">
                  {{ app.utmCampaign ?? '—' }}
                </td>
                <!-- Status -->
                <td class="px-4 py-3.5 text-center">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset"
                    :class="statusBadgeClasses[app.status] ?? 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400 ring-surface-200 dark:ring-surface-700'"
                  >
                    {{ app.status }}
                  </span>
                </td>
                <!-- Applied date -->
                <td class="px-4 py-3.5 text-right text-[11px] text-surface-400 tabular-nums font-medium">
                  {{ formatDate(app.appliedAt) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Detail sidebar -->
    <CandidateDetailSidebar
      v-if="selectedAppId"
      :application-id="selectedAppId"
      :open="sidebarOpen"
      @close="closeSidebar"
      @updated="handleSidebarUpdated"
    />

    <!-- ═══════════════════════════════════════ -->
    <!-- Modal: Edit tracking link                -->
    <!-- ═══════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 dark:bg-black/70" @click="showEditModal = false" />
        <div class="relative w-full max-w-lg rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800">
            <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Edit Tracking Link</h2>
            <button
              class="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              @click="showEditModal = false"
            >
              <X class="size-4" />
            </button>
          </div>

          <!-- Body -->
          <form class="px-6 py-5 space-y-4" @submit.prevent="handleSaveEdit">
            <!-- Name -->
            <div>
              <label for="edit-link-name" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Link Name</label>
              <input
                id="edit-link-name"
                v-model="editForm.name"
                type="text"
                class="w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-2.5 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>

            <!-- Channel -->
            <div>
              <label for="edit-link-channel" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Source Channel</label>
              <select
                id="edit-link-channel"
                v-model="editForm.channel"
                class="w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-2.5 text-sm text-surface-900 dark:text-surface-100 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
              >
                <optgroup label="Job Boards">
                  <option v-for="ch in ['linkedin', 'indeed', 'glassdoor', 'ziprecruiter', 'monster', 'handshake', 'angellist', 'wellfound', 'dice', 'stackoverflow', 'weworkremotely', 'remoteok', 'builtin', 'hired', 'lever', 'greenhouse_board', 'google_jobs']" :key="ch" :value="ch">{{ getChannelLabel(ch) }}</option>
                </optgroup>
                <optgroup label="Social Media">
                  <option v-for="ch in ['facebook', 'twitter', 'instagram', 'tiktok', 'reddit']" :key="ch" :value="ch">{{ getChannelLabel(ch) }}</option>
                </optgroup>
                <optgroup label="Other">
                  <option v-for="ch in ['referral', 'career_site', 'email', 'event', 'agency', 'direct', 'custom', 'other']" :key="ch" :value="ch">{{ getChannelLabel(ch) }}</option>
                </optgroup>
              </select>
            </div>

            <!-- UTM fields -->
            <details class="group">
              <summary class="flex items-center gap-2 text-sm font-medium text-surface-500 dark:text-surface-400 cursor-pointer select-none hover:text-surface-700 dark:hover:text-surface-200 transition-colors">
                <ChevronDown class="size-4 transition-transform group-open:rotate-180" />
                UTM Parameters
              </summary>
              <div class="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label for="edit-utm-source" class="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">utm_source</label>
                  <input id="edit-utm-source" v-model="editForm.utmSource" type="text" placeholder="linkedin" class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
                </div>
                <div>
                  <label for="edit-utm-medium" class="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">utm_medium</label>
                  <input id="edit-utm-medium" v-model="editForm.utmMedium" type="text" placeholder="social" class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
                </div>
                <div>
                  <label for="edit-utm-campaign" class="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">utm_campaign</label>
                  <input id="edit-utm-campaign" v-model="editForm.utmCampaign" type="text" placeholder="spring-hiring" class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
                </div>
                <div>
                  <label for="edit-utm-term" class="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">utm_term</label>
                  <input id="edit-utm-term" v-model="editForm.utmTerm" type="text" placeholder="keyword" class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
                </div>
                <div class="col-span-2">
                  <label for="edit-utm-content" class="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">utm_content</label>
                  <input id="edit-utm-content" v-model="editForm.utmContent" type="text" placeholder="banner-ad" class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
                </div>
              </div>
            </details>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                class="rounded-xl px-4 py-2.5 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                @click="showEditModal = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!editForm.name.trim() || isSaving"
                class="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 shadow-sm shadow-brand-600/15 transition-all"
              >
                {{ isSaving ? 'Saving…' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
