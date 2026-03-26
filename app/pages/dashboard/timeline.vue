<script setup lang="ts">
import {
  Clock, Briefcase, Users, User, FileText, Calendar,
  Plus, Trash2, Edit3, UserPlus, UserMinus,
  ShieldCheck, Sparkles, MessageSquare, GitCommit,
  ChevronDown, ChevronRight, ArrowDown, Loader2,
  AlertCircle, History, ArrowRight, Search, X,
} from 'lucide-vue-next'

const NuxtLinkComponent = resolveComponent('NuxtLink')
const route = useRoute()

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Timeline — Reqcore',
  description: 'Full activity timeline for your organization',
})

const localePath = useLocalePath()
const { track } = useTrack()

const {
  dayGroups,
  totalEvents,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  activeFilter,
  loadInitial,
  loadMore,
} = useTimeline()

// ─────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────

const searchQuery = ref('')

const filteredDayGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return dayGroups.value

  return dayGroups.value
    .map((group) => {
      // If date/label matches, show entire group
      const dateMatches = group.label.toLowerCase().includes(q)
        || group.date.includes(q)
        || formatFullDate(group.date).toLowerCase().includes(q)

      if (dateMatches) return group

      // Filter sections to only include matching items
      const filteredSections = group.sections
        .map((section) => {
          const matchLabel = section.label.toLowerCase().includes(q)
          if (matchLabel) return section

          const matchingDirectItems = section.directItems.filter(item => itemMatchesSearch(item, q))
          const matchingCandidateGroups = section.candidateGroups
            .map(cg => ({
              ...cg,
              items: cg.items.filter(item => itemMatchesSearch(item, q)),
            }))
            .filter(cg => cg.items.length > 0)

          if (matchingDirectItems.length === 0 && matchingCandidateGroups.length === 0) return null

          return {
            ...section,
            directItems: matchingDirectItems,
            candidateGroups: matchingCandidateGroups,
            items: [...matchingDirectItems, ...matchingCandidateGroups.flatMap(cg => cg.items)],
          }
        })
        .filter((s): s is TimelineSection => s !== null)

      if (filteredSections.length === 0) return null

      return {
        ...group,
        sections: filteredSections,
        items: filteredSections.flatMap(s => s.items),
      }
    })
    .filter((g): g is TimelineDayGroup => g !== null)
})

const filteredEventCount = computed(() => filteredDayGroups.value.reduce((sum, g) => sum + g.items.length, 0))

function itemMatchesSearch(item: TimelineItem, query: string): boolean {
  return (item.actorName?.toLowerCase().includes(query) ?? false)
    || (item.resourceName?.toLowerCase().includes(query) ?? false)
    || (item.candidateName?.toLowerCase().includes(query) ?? false)
    || (item.jobName?.toLowerCase().includes(query) ?? false)
    || (item.actorEmail?.toLowerCase().includes(query) ?? false)
}

// Load data on mount
const targetDate = ref<string | null>(null)
const dateRefs = ref<Record<string, HTMLElement | null>>({})

function setDateRef(date: string, isToday: boolean, el: any) {
  const htmlEl = el?.$el ?? el ?? null
  dateRefs.value[date] = htmlEl
  if (isToday) todayRef.value = htmlEl
}

onMounted(async () => {
  track('timeline_viewed')
  const dateParam = route.query.date as string | undefined
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    targetDate.value = dateParam
  }
  await loadInitial()
  if (targetDate.value) {
    // Keep loading older pages until the target date is present or no more data
    while (!dayGroups.value.some(g => g.date === targetDate.value) && hasMore.value) {
      await loadMore()
    }
    // Wait for the DOM element to appear (more reliable than a fixed timeout)
    await nextTick()
    const maxAttempts = 20
    for (let i = 0; i < maxAttempts; i++) {
      const el = dateRefs.value[targetDate.value]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      await nextTick()
    }
  }
})

// ─────────────────────────────────────────────
// Filters
// ─────────────────────────────────────────────

const filters = [
  { key: undefined, label: 'All activity', icon: History },
  { key: 'job', label: 'Jobs', icon: Briefcase },
  { key: 'candidate', label: 'Candidates', icon: Users },
  { key: 'application', label: 'Applications', icon: FileText },
  { key: 'interview', label: 'Interviews', icon: Calendar },
] as const

async function setFilter(type?: string) {
  await loadInitial(type)
}

// ─────────────────────────────────────────────
// Collapsible state
// ─────────────────────────────────────────────

const collapsedSections = reactive(new Set<string>())

function toggleSection(key: string) {
  if (collapsedSections.has(key)) collapsedSections.delete(key)
  else collapsedSections.add(key)
}

function sectionKey(date: string, section: { jobId?: string, type: string }) {
  return `${date}::${section.jobId ?? section.type}`
}

// ─────────────────────────────────────────────
// Infinite scroll
// ─────────────────────────────────────────────

const scrollSentinel = useTemplateRef<HTMLElement>('scrollSentinel')

onMounted(() => {
  if (!scrollSentinel.value) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && !isLoadingMore.value) {
        loadMore()
      }
    },
    { rootMargin: '400px' },
  )
  observer.observe(scrollSentinel.value)
  onUnmounted(() => observer.disconnect())
})

// ─────────────────────────────────────────────
// Scroll to today
// ─────────────────────────────────────────────

const todayRef = ref<HTMLElement | null>(null)

function scrollToToday() {
  todayRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ─────────────────────────────────────────────
// Action / resource styling helpers
// ─────────────────────────────────────────────

interface ActionStyle {
  icon: typeof Plus
  color: string
  bg: string
  ring: string
  label: string
}

function getActionStyle(action: string, resourceType: string, metadata?: Record<string, unknown> | null): ActionStyle {
  // For status_changed, derive colors from the target pipeline status
  if (action === 'status_changed' && metadata) {
    const toStatus = String(metadata.toStatus ?? metadata.to ?? '').toLowerCase()
    const colors = getPipelineStatusColors(toStatus)
    return { icon: ArrowRight, ...colors, label: 'Moved' }
  }

  const map: Record<string, ActionStyle> = {
    created: {
      icon: Plus,
      color: 'text-success-600 dark:text-success-400',
      bg: 'bg-success-50 dark:bg-success-950/50',
      ring: 'ring-success-200 dark:ring-success-800',
      label: 'Created',
    },
    updated: {
      icon: Edit3,
      color: 'text-brand-600 dark:text-brand-400',
      bg: 'bg-brand-50 dark:bg-brand-950/50',
      ring: 'ring-brand-200 dark:ring-brand-800',
      label: 'Updated',
    },
    deleted: {
      icon: Trash2,
      color: 'text-danger-600 dark:text-danger-400',
      bg: 'bg-danger-50 dark:bg-danger-950/50',
      ring: 'ring-danger-200 dark:ring-danger-800',
      label: 'Deleted',
    },
    status_changed: {
      icon: ArrowRight,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      ring: 'ring-blue-200 dark:ring-blue-800',
      label: 'Status changed',
    },
    comment_added: {
      icon: MessageSquare,
      color: 'text-info-600 dark:text-info-400',
      bg: 'bg-info-50 dark:bg-info-950/50',
      ring: 'ring-info-200 dark:ring-info-800',
      label: 'Comment added',
    },
    member_invited: {
      icon: UserPlus,
      color: 'text-accent-600 dark:text-accent-400',
      bg: 'bg-accent-50 dark:bg-accent-950/50',
      ring: 'ring-accent-200 dark:ring-accent-800',
      label: 'Member invited',
    },
    member_removed: {
      icon: UserMinus,
      color: 'text-danger-600 dark:text-danger-400',
      bg: 'bg-danger-50 dark:bg-danger-950/50',
      ring: 'ring-danger-200 dark:ring-danger-800',
      label: 'Member removed',
    },
    member_role_changed: {
      icon: ShieldCheck,
      color: 'text-brand-600 dark:text-brand-400',
      bg: 'bg-brand-50 dark:bg-brand-950/50',
      ring: 'ring-brand-200 dark:ring-brand-800',
      label: 'Role changed',
    },
    scored: {
      icon: Sparkles,
      color: 'text-accent-600 dark:text-accent-400',
      bg: 'bg-accent-50 dark:bg-accent-950/50',
      ring: 'ring-accent-200 dark:ring-accent-800',
      label: 'AI scored',
    },
    scheduled: {
      icon: Calendar,
      color: 'text-brand-600 dark:text-brand-400',
      bg: 'bg-brand-50 dark:bg-brand-950/50',
      ring: 'ring-brand-200 dark:ring-brand-800',
      label: 'Scheduled',
    },
  }

  return map[action] ?? {
    icon: GitCommit,
    color: 'text-surface-500 dark:text-surface-400',
    bg: 'bg-surface-100 dark:bg-surface-800',
    ring: 'ring-surface-200 dark:ring-surface-700',
    label: action,
  }
}

function getSectionIcon(type: string) {
  const map: Record<string, typeof Briefcase> = {
    job: Briefcase,
    candidates: Users,
    team: ShieldCheck,
    other: GitCommit,
  }
  return map[type] ?? GitCommit
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatusChangeDescription(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null
  const from = metadata.fromStatus ?? metadata.from
  const to = metadata.toStatus ?? metadata.to
  if (from && to) return `${from} → ${to}`
  if (to) return `→ ${to}`
  return null
}

function getPipelineStatusColors(status: string): { color: string, bg: string, ring: string } {
  const map: Record<string, { color: string, bg: string, ring: string }> = {
    new: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50', ring: 'ring-blue-200 dark:ring-blue-800' },
    screening: { color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/50', ring: 'ring-violet-200 dark:ring-violet-800' },
    interview: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50', ring: 'ring-amber-200 dark:ring-amber-800' },
    offer: { color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/50', ring: 'ring-teal-200 dark:ring-teal-800' },
    hired: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/50', ring: 'ring-green-200 dark:ring-green-800' },
    rejected: { color: 'text-surface-500 dark:text-surface-400', bg: 'bg-surface-100 dark:bg-surface-800', ring: 'ring-surface-200 dark:ring-surface-700' },
  }
  return map[status] ?? { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50', ring: 'ring-blue-200 dark:ring-blue-800' }
}

function getStatusBadgeClasses(status: string): string {
  const s = status.toLowerCase()
  const map: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
    screening: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
    interview: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    offer: 'bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300',
    hired: 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300',
    rejected: 'bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300',
  }
  return map[s] ?? 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'
}

function getEventDescription(item: TimelineItem): string {
  const typeLabels: Record<string, string> = {
    job: 'Job',
    candidate: 'Candidate',
    application: 'Application',
    interview: 'Interview',
    member: 'Team member',
  }
  const type = typeLabels[item.resourceType] ?? item.resourceType

  switch (item.action) {
    case 'created': return `${type} created`
    case 'updated': return `${type} updated`
    case 'deleted': return `${type} deleted`
    case 'status_changed': return `${type} moved`
    case 'comment_added': return `Comment on ${type.toLowerCase()}`
    case 'member_invited': return 'Member invited'
    case 'member_removed': return 'Member removed'
    case 'member_role_changed': return 'Role changed'
    case 'scored': return `${type} scored by AI`
    case 'scheduled': return `${type} scheduled`
    default: return `${type} ${item.action.replace(/_/g, ' ')}`
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <!-- ─── Page header ─── -->
    <div class="mb-6">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            Timeline
          </h1>
          <span
            v-if="totalEvents > 0 && !isLoading"
            class="text-xs text-surface-400 dark:text-surface-500 tabular-nums"
          >
            <template v-if="searchQuery.trim()">{{ filteredEventCount }} of </template>{{ totalEvents.toLocaleString() }} events
          </span>
        </div>

        <!-- Scroll to today button -->
        <button
          v-if="dayGroups.length > 0 && !isLoading"
          class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors cursor-pointer"
          @click="scrollToToday"
        >
          <ArrowDown class="size-3" />
          Today
        </button>
      </div>

      <!-- Filter pills -->
      <div class="mt-3 flex items-center gap-1.5 flex-wrap">
        <button
          v-for="f in filters"
          :key="f.key ?? 'all'"
          class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 cursor-pointer"
          :class="activeFilter === f.key
            ? 'bg-brand-600 text-white'
            : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-700 dark:hover:text-surface-300'"
          @click="setFilter(f.key)"
        >
          <component :is="f.icon" class="size-3" />
          {{ f.label }}
        </button>
      </div>

      <!-- Search bar -->
      <div class="mt-3 relative">
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-surface-400 dark:text-surface-500 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by name, date, or keyword…"
            class="w-full rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 pl-8 pr-8 py-1.5 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 dark:focus:border-brand-600 transition-colors"
          />
          <button
            v-if="searchQuery"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300 cursor-pointer"
            @click="searchQuery = ''"
          >
            <X class="size-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Loading skeleton ─── -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i">
        <div class="h-4 w-28 bg-surface-200 dark:bg-surface-700 rounded animate-pulse mb-2" />
        <div class="space-y-1">
          <div
            v-for="j in (4 - i)"
            :key="j"
            class="flex items-center gap-2 py-1.5 animate-pulse"
          >
            <div class="size-5 rounded bg-surface-200 dark:bg-surface-700 shrink-0" />
            <div class="h-3.5 flex-1 max-w-xs bg-surface-200 dark:bg-surface-700 rounded" />
            <div class="h-3 w-12 bg-surface-200 dark:bg-surface-700 rounded ml-auto" />
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Error state ─── -->
    <div
      v-else-if="error"
      class="rounded-lg border border-danger-200 dark:border-danger-900 bg-danger-50 dark:bg-danger-950/60 p-4 text-sm text-danger-700 dark:text-danger-400 flex items-center gap-3"
    >
      <AlertCircle class="size-4 shrink-0" />
      <span>{{ error }}</span>
      <button class="underline ml-auto font-medium cursor-pointer" @click="loadInitial(activeFilter)">
        Retry
      </button>
    </div>

    <!-- ─── Empty state ─── -->
    <div
      v-else-if="dayGroups.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-10 text-center max-w-sm">
        <div class="mx-auto mb-5 flex items-center justify-center size-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700">
          <History class="size-6 text-white" />
        </div>
        <h2 class="text-lg font-bold text-surface-900 dark:text-surface-100 mb-2 tracking-tight">
          No activity yet
        </h2>
        <p class="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
          Activity will appear here as you create jobs, add candidates, and process applications.
        </p>
        <NuxtLink
          :to="localePath('/dashboard/jobs')"
          class="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors no-underline"
        >
          <Briefcase class="size-4" />
          Create your first job
        </NuxtLink>
      </div>
    </div>

    <!-- ─── No search results ─── -->
    <div
      v-else-if="filteredDayGroups.length === 0 && searchQuery.trim()"
      class="flex flex-col items-center justify-center py-16"
    >
      <Search class="size-8 text-surface-300 dark:text-surface-600 mb-3" />
      <p class="text-sm font-medium text-surface-500 dark:text-surface-400">
        No results for “{{ searchQuery.trim() }}”
      </p>
      <p class="text-xs text-surface-400 dark:text-surface-500 mt-1">
        Try searching by name, date, or keyword
      </p>
      <button
        class="mt-3 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
        @click="searchQuery = ''"
      >
        Clear search
      </button>
    </div>

    <!-- ─── Timeline ─── -->
    <div v-else class="relative">
      <!-- Vertical timeline line -->
      <div class="absolute left-3.5 top-0 bottom-0 w-px bg-surface-200 dark:bg-surface-800" />

      <div class="space-y-6">
        <div v-for="group in filteredDayGroups" :key="group.date">
          <!-- Day header -->
          <div
            :ref="(el: any) => setDateRef(group.date, group.isToday, el)"
            class="relative flex items-center gap-3 mb-1 transition-colors duration-700 rounded-lg -mx-2 px-2 py-1"
            :class="targetDate === group.date ? 'bg-brand-50/80 dark:bg-brand-950/30 ring-1 ring-brand-200 dark:ring-brand-800' : ''"
          >
            <!-- Day dot on the timeline -->
            <div
              class="relative z-10 flex items-center justify-center size-7 rounded-full border shrink-0"
              :class="group.isToday
                ? 'border-brand-500 bg-brand-600'
                : group.isFuture
                  ? 'border-accent-400 dark:border-accent-600 bg-accent-50 dark:bg-accent-950'
                  : 'border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900'"
            >
              <span
                v-if="group.isToday"
                class="text-[9px] font-bold text-white uppercase tracking-wider"
              >
                Now
              </span>
              <Calendar
                v-else-if="group.isFuture"
                class="size-3 text-accent-600 dark:text-accent-400"
              />
              <span
                v-else
                class="text-[10px] font-bold text-surface-500 dark:text-surface-400 tabular-nums"
              >
                {{ new Date(group.date + 'T00:00:00').getDate() }}
              </span>
            </div>

            <!-- Day label -->
            <div class="flex items-baseline gap-2">
              <h2
                class="text-sm font-semibold"
                :class="group.isToday
                  ? 'text-brand-700 dark:text-brand-300'
                  : group.isFuture
                    ? 'text-accent-700 dark:text-accent-300'
                    : 'text-surface-900 dark:text-surface-100'"
              >
                {{ group.label }}
              </h2>
              <span class="text-[11px] text-surface-400 dark:text-surface-500 tabular-nums">
                {{ formatFullDate(group.date) }}
              </span>
              <span class="text-[11px] text-surface-400 dark:text-surface-500 tabular-nums">
                · {{ group.items.length }}
              </span>
            </div>
          </div>

          <!-- Events for this day, grouped by purpose -->
          <div class="ml-3.5 pl-5 space-y-3 mt-1">
            <div v-for="section in group.sections" :key="section.jobId ?? section.type" class="rounded-lg border border-surface-150 dark:border-surface-800 bg-white dark:bg-surface-900/60 overflow-hidden">
              <!-- Section header (collapsible) -->
              <button
                class="flex items-center gap-2 px-3 py-2 w-full border-b border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/40 cursor-pointer hover:bg-surface-100/60 dark:hover:bg-surface-800/60 transition-colors"
                @click="toggleSection(sectionKey(group.date, section))"
              >
                <ChevronRight
                  class="size-3 text-surface-400 dark:text-surface-500 transition-transform duration-150 shrink-0"
                  :class="{ 'rotate-90': !collapsedSections.has(sectionKey(group.date, section)) }"
                />
                <component :is="getSectionIcon(section.type)" class="size-3.5 text-surface-400 dark:text-surface-500 shrink-0" />
                <component
                  :is="section.jobUrl ? NuxtLinkComponent : 'span'"
                  :to="section.jobUrl ? localePath(section.jobUrl) : undefined"
                  class="text-xs font-semibold tracking-wide no-underline truncate"
                  :class="section.type === 'job'
                    ? 'text-surface-800 dark:text-surface-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors'
                    : 'text-surface-500 dark:text-surface-400 uppercase'"
                  @click.stop
                >
                  {{ section.label }}
                </component>
                <span class="text-[10px] text-surface-300 dark:text-surface-600 tabular-nums ml-auto shrink-0">
                  {{ section.items.length }}
                </span>
              </button>

              <!-- Section content (collapsible) -->
              <div v-if="!collapsedSections.has(sectionKey(group.date, section))">
                <!-- Direct items (job-level events, team events, etc.) -->
                <div v-if="section.directItems.length" class="divide-y divide-surface-100 dark:divide-surface-800/60">
                  <component
                    :is="item.resourceUrl ? NuxtLinkComponent : 'div'"
                    v-for="item in section.directItems"
                    :key="item.id"
                    :to="item.resourceUrl ? localePath(item.resourceUrl) : undefined"
                    class="group relative flex items-center gap-2 py-2 px-3 transition-colors duration-150 no-underline"
                    :class="[item.resourceUrl ? 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/60' : '']"
                  >
                    <div class="flex items-center justify-center size-6 rounded shrink-0" :class="getActionStyle(item.action, item.resourceType, item.metadata).bg">
                      <component :is="getActionStyle(item.action, item.resourceType, item.metadata).icon" class="size-3" :class="getActionStyle(item.action, item.resourceType, item.metadata).color" />
                    </div>
                    <div class="flex-1 min-w-0 flex items-center gap-1.5">
                      <span class="text-[13px] font-medium text-surface-900 dark:text-surface-100 shrink-0">{{ getEventDescription(item) }}</span>
                      <span v-if="item.resourceName" class="text-[13px] text-surface-600 dark:text-surface-300 truncate group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">&mdash; {{ item.resourceName }}</span>
                      <template v-if="item.action === 'status_changed' && item.metadata">
                        <span v-if="item.metadata.fromStatus || item.metadata.from" class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none" :class="getStatusBadgeClasses(String(item.metadata.fromStatus ?? item.metadata.from))">{{ item.metadata.fromStatus ?? item.metadata.from }}</span>
                        <ArrowRight class="size-2.5 text-surface-400 dark:text-surface-500 shrink-0" />
                        <span v-if="item.metadata.toStatus || item.metadata.to" class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none" :class="getStatusBadgeClasses(String(item.metadata.toStatus ?? item.metadata.to))">{{ item.metadata.toStatus ?? item.metadata.to }}</span>
                      </template>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <div v-if="item.actorName" class="flex items-center gap-1">
                        <img v-if="item.actorImage" :src="item.actorImage" :alt="item.actorName" class="size-4 rounded-full object-cover" />
                        <div v-else class="size-4 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                          <span class="text-[8px] font-bold text-surface-500 dark:text-surface-400">{{ item.actorName.charAt(0).toUpperCase() }}</span>
                        </div>
                        <span class="text-[11px] text-surface-400 dark:text-surface-500 max-w-[80px] truncate">{{ item.actorName }}</span>
                      </div>
                      <span class="text-[11px] text-surface-400 dark:text-surface-500 tabular-nums">{{ formatTime(item.createdAt) }}</span>
                    </div>
                  </component>
                </div>

                <!-- Candidate groups (flat list per candidate) -->
                <div v-for="cGroup in section.candidateGroups" :key="cGroup.candidateId" class="border-t border-surface-100 dark:border-surface-800/60">
                  <!-- Candidate label -->
                  <div class="flex items-center gap-2 px-3 py-1.5 pl-5">
                    <User class="size-3 text-surface-400 dark:text-surface-500 shrink-0" />
                    <component
                      :is="cGroup.candidateUrl ? NuxtLinkComponent : 'span'"
                      :to="cGroup.candidateUrl ? localePath(cGroup.candidateUrl) : undefined"
                      class="text-[12px] font-semibold text-surface-700 dark:text-surface-300 no-underline truncate hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      {{ cGroup.candidateName }}
                    </component>
                  </div>

                  <!-- Candidate events (flat) -->
                  <div class="divide-y divide-surface-50 dark:divide-surface-800/40">
                    <component
                      :is="item.resourceUrl ? NuxtLinkComponent : 'div'"
                      v-for="item in cGroup.items"
                      :key="item.id"
                      :to="item.resourceUrl ? localePath(item.resourceUrl) : undefined"
                      class="group relative flex items-center gap-2 py-1.5 px-3 pl-6 transition-colors duration-150 no-underline"
                      :class="[
                        item.resourceUrl ? 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/60' : '',
                        item.isUpcoming ? 'bg-accent-50/50 dark:bg-accent-950/20' : '',
                      ]"
                    >
                      <div class="flex items-center justify-center size-5 rounded shrink-0" :class="getActionStyle(item.action, item.resourceType, item.metadata).bg">
                        <component :is="getActionStyle(item.action, item.resourceType, item.metadata).icon" class="size-2.5" :class="getActionStyle(item.action, item.resourceType, item.metadata).color" />
                      </div>
                      <div class="flex-1 min-w-0 flex items-center gap-1.5">
                        <span class="text-[12px] font-medium shrink-0" :class="getActionStyle(item.action, item.resourceType, item.metadata).color">{{ getEventDescription(item) }}</span>
                        <span v-if="item.resourceName" class="text-[12px] text-surface-600 dark:text-surface-300 truncate group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">{{ item.resourceName }}</span>
                        <template v-if="item.action === 'status_changed' && item.metadata">
                          <span v-if="item.metadata.fromStatus || item.metadata.from" class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none" :class="getStatusBadgeClasses(String(item.metadata.fromStatus ?? item.metadata.from))">{{ item.metadata.fromStatus ?? item.metadata.from }}</span>
                          <ArrowRight class="size-2.5 text-surface-400 dark:text-surface-500 shrink-0" />
                          <span v-if="item.metadata.toStatus || item.metadata.to" class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none" :class="getStatusBadgeClasses(String(item.metadata.toStatus ?? item.metadata.to))">{{ item.metadata.toStatus ?? item.metadata.to }}</span>
                        </template>
                        <span v-if="item.isUpcoming" class="text-[11px] font-medium text-accent-600 dark:text-accent-400 shrink-0">Upcoming</span>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <div v-if="item.actorName" class="flex items-center gap-1">
                          <img v-if="item.actorImage" :src="item.actorImage" :alt="item.actorName" class="size-3.5 rounded-full object-cover" />
                          <div v-else class="size-3.5 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                            <span class="text-[7px] font-bold text-surface-500 dark:text-surface-400">{{ item.actorName.charAt(0).toUpperCase() }}</span>
                          </div>
                          <span class="text-[10px] text-surface-400 dark:text-surface-500 max-w-[70px] truncate">{{ item.actorName }}</span>
                        </div>
                        <span class="text-[10px] text-surface-400 dark:text-surface-500 tabular-nums">{{ formatTime(item.createdAt) }}</span>
                      </div>
                    </component>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load more sentinel & indicator -->
      <div ref="scrollSentinel" class="relative mt-6">
        <div v-if="isLoadingMore" class="flex items-center justify-center gap-2 py-6 text-xs text-surface-500 dark:text-surface-400">
          <Loader2 class="size-3.5 animate-spin" />
          Loading more…
        </div>
        <div v-else-if="hasMore" class="flex justify-center py-4">
          <button
            class="inline-flex items-center gap-1.5 rounded-md border border-surface-200 dark:border-surface-800 px-3 py-1.5 text-xs font-medium text-surface-500 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-300 dark:hover:border-brand-700 transition-colors cursor-pointer"
            @click="loadMore"
          >
            <ChevronDown class="size-3.5" />
            Load older events
          </button>
        </div>
        <div v-else-if="totalEvents > 0" class="flex items-center justify-center gap-2 py-6 text-xs text-surface-400 dark:text-surface-500">
          <Clock class="size-3.5" />
          Beginning of timeline
        </div>
      </div>
    </div>
  </div>
</template>
