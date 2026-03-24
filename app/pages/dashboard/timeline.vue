<script setup lang="ts">
import {
  Clock, Briefcase, Users, User, FileText, Calendar,
  Plus, Trash2, Edit3, UserPlus, UserMinus,
  ShieldCheck, Sparkles, MessageSquare, GitCommit,
  ChevronDown, ChevronRight, ArrowDown, Loader2,
  AlertCircle, History, ArrowRight,
} from 'lucide-vue-next'

const NuxtLinkComponent = resolveComponent('NuxtLink')

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

// Load data on mount
onMounted(async () => {
  track('timeline_viewed')
  await loadInitial()
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
const collapsedCandidates = reactive(new Set<string>())

function toggleSection(key: string) {
  if (collapsedSections.has(key)) collapsedSections.delete(key)
  else collapsedSections.add(key)
}

function toggleCandidate(key: string) {
  if (collapsedCandidates.has(key)) collapsedCandidates.delete(key)
  else collapsedCandidates.add(key)
}

function sectionKey(date: string, section: { jobId?: string, type: string }) {
  return `${date}::${section.jobId ?? section.type}`
}

function candidateKey(date: string, section: { jobId?: string, type: string }, candidateId: string) {
  return `${date}::${section.jobId ?? section.type}::${candidateId}`
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

const todayRef = useTemplateRef<HTMLElement>('todayMarker')

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

function getActionStyle(action: string, resourceType: string): ActionStyle {
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
      color: 'text-warning-600 dark:text-warning-400',
      bg: 'bg-warning-50 dark:bg-warning-950/50',
      ring: 'ring-warning-200 dark:ring-warning-800',
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
            {{ totalEvents.toLocaleString() }} events
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

    <!-- ─── Timeline ─── -->
    <div v-else class="relative">
      <!-- Vertical timeline line -->
      <div class="absolute left-3.5 top-0 bottom-0 w-px bg-surface-200 dark:bg-surface-800" />

      <div class="space-y-6">
        <div v-for="group in dayGroups" :key="group.date">
          <!-- Day header -->
          <div
            :ref="group.isToday ? 'todayMarker' : undefined"
            class="relative flex items-center gap-3 mb-1"
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
                <!-- Direct items (e.g., job created/updated, team events) -->
                <div v-if="section.directItems.length" class="divide-y divide-surface-100 dark:divide-surface-800/60">
                  <component
                    :is="item.resourceUrl ? NuxtLinkComponent : 'div'"
                    v-for="item in section.directItems"
                    :key="item.id"
                    :to="item.resourceUrl ? localePath(item.resourceUrl) : undefined"
                    class="group relative flex items-center gap-2 py-2 px-3 transition-colors duration-150 no-underline"
                    :class="[item.resourceUrl ? 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/60' : '']"
                  >
                    <div class="flex items-center justify-center size-6 rounded shrink-0" :class="getActionStyle(item.action, item.resourceType).bg">
                      <component :is="getActionStyle(item.action, item.resourceType).icon" class="size-3" :class="getActionStyle(item.action, item.resourceType).color" />
                    </div>
                    <div class="flex-1 min-w-0 flex items-center gap-1.5">
                      <span class="text-[13px] font-medium text-surface-900 dark:text-surface-100 shrink-0">{{ getActionStyle(item.action, item.resourceType).label }}</span>
                      <span v-if="item.resourceName" class="text-[13px] text-surface-600 dark:text-surface-300 truncate group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">— {{ item.resourceName }}</span>
                      <span v-if="item.action === 'status_changed' && getStatusChangeDescription(item.metadata)" class="text-[11px] text-warning-600 dark:text-warning-400 shrink-0">{{ getStatusChangeDescription(item.metadata) }}</span>
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

                <!-- Candidate groups (deep hierarchy) -->
                <div v-for="cGroup in section.candidateGroups" :key="cGroup.candidateId" class="border-t border-surface-100 dark:border-surface-800/60">
                  <!-- Candidate sub-header (collapsible) -->
                  <button
                    class="flex items-center gap-2 px-3 py-1.5 pl-5 w-full cursor-pointer hover:bg-surface-50/80 dark:hover:bg-surface-800/40 transition-colors"
                    @click="toggleCandidate(candidateKey(group.date, section, cGroup.candidateId))"
                  >
                    <ChevronRight
                      class="size-2.5 text-surface-400 dark:text-surface-500 transition-transform duration-150 shrink-0"
                      :class="{ 'rotate-90': !collapsedCandidates.has(candidateKey(group.date, section, cGroup.candidateId)) }"
                    />
                    <User class="size-3 text-surface-400 dark:text-surface-500 shrink-0" />
                    <component
                      :is="cGroup.candidateUrl ? NuxtLinkComponent : 'span'"
                      :to="cGroup.candidateUrl ? localePath(cGroup.candidateUrl) : undefined"
                      class="text-[12px] font-semibold text-surface-700 dark:text-surface-300 no-underline truncate hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                      @click.stop
                    >
                      {{ cGroup.candidateName }}
                    </component>
                    <span class="text-[10px] text-surface-300 dark:text-surface-600 tabular-nums ml-auto shrink-0">
                      {{ cGroup.items.length }}
                    </span>
                  </button>

                  <!-- Candidate content: action groups -->
                  <div v-if="!collapsedCandidates.has(candidateKey(group.date, section, cGroup.candidateId))" class="pl-5">
                    <div v-for="aGroup in cGroup.actionGroups" :key="aGroup.action">
                      <!-- Action group label -->
                      <div class="flex items-center gap-1.5 px-3 py-1">
                        <component :is="getActionStyle(aGroup.action, '').icon" class="size-2.5" :class="getActionStyle(aGroup.action, '').color" />
                        <span class="text-[10px] font-semibold uppercase tracking-wider" :class="getActionStyle(aGroup.action, '').color">
                          {{ aGroup.label }}
                        </span>
                        <span class="text-[10px] text-surface-300 dark:text-surface-600 tabular-nums">{{ aGroup.items.length }}</span>
                      </div>

                      <!-- Action items -->
                      <div class="divide-y divide-surface-50 dark:divide-surface-800/40">
                        <component
                          :is="item.resourceUrl ? NuxtLinkComponent : 'div'"
                          v-for="item in aGroup.items"
                          :key="item.id"
                          :to="item.resourceUrl ? localePath(item.resourceUrl) : undefined"
                          class="group relative flex items-center gap-2 py-1.5 px-3 pl-6 transition-colors duration-150 no-underline"
                          :class="[
                            item.resourceUrl ? 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/60' : '',
                            item.isUpcoming ? 'bg-accent-50/50 dark:bg-accent-950/20' : '',
                          ]"
                        >
                          <div class="flex items-center justify-center size-5 rounded shrink-0" :class="getActionStyle(item.action, item.resourceType).bg">
                            <component :is="getActionStyle(item.action, item.resourceType).icon" class="size-2.5" :class="getActionStyle(item.action, item.resourceType).color" />
                          </div>
                          <div class="flex-1 min-w-0 flex items-center gap-1.5">
                            <span v-if="item.resourceName" class="text-[12px] text-surface-600 dark:text-surface-300 truncate group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">{{ item.resourceName }}</span>
                            <span v-if="item.action === 'status_changed' && getStatusChangeDescription(item.metadata)" class="text-[11px] text-warning-600 dark:text-warning-400 shrink-0">{{ getStatusChangeDescription(item.metadata) }}</span>
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
