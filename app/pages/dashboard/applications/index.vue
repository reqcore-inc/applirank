<script setup lang="ts">
import { FileText, Search, X, ChevronDown, Briefcase, Mail, Clock } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Applications — Applirank',
  description: 'Manage applications across all jobs',
})

const router = useRouter()

// ── Search ────────────────────────────────────────────────────────────────────

const searchInput = ref('')
const debouncedSearch = ref('')

let debounceTimer: ReturnType<typeof setTimeout>
watch(searchInput, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = val.trim().toLowerCase()
  }, 250)
})

// ── Status filter ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const
type Status = typeof STATUS_OPTIONS[number]

const activeStatus = useState<Status | undefined>('app-filter-status', () => undefined)

const statusFilter = computed(() => activeStatus.value)

const { applications, total, fetchStatus, error, refresh } = useApplications({
  status: statusFilter,
})

// ── Job filter (client-side) ──────────────────────────────────────────────────

const activeJobId = ref<string | undefined>(undefined)
const jobDropdownOpen = ref(false)
const jobDropdownRef = ref<HTMLElement | null>(null)

const uniqueJobs = computed(() => {
  const map = new Map<string, string>()
  for (const app of applications.value) {
    if (!map.has(app.jobId)) map.set(app.jobId, app.jobTitle)
  }
  return Array.from(map, ([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title))
})

function handleJobDropdownOutside(e: MouseEvent) {
  if (jobDropdownRef.value && !jobDropdownRef.value.contains(e.target as Node)) {
    jobDropdownOpen.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', handleJobDropdownOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleJobDropdownOutside))

// ── Sorting ───────────────────────────────────────────────────────────────────

type SortOption = 'newest' | 'oldest' | 'score-high' | 'score-low' | 'name-az' | 'name-za'
const activeSort = useState<SortOption>('app-sort', () => 'newest')
const sortDropdownOpen = ref(false)
const sortDropdownRef = ref<HTMLElement | null>(null)

const sortOptions: { value: SortOption, label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'score-high', label: 'Score: high to low' },
  { value: 'score-low', label: 'Score: low to high' },
  { value: 'name-az', label: 'Name: A → Z' },
  { value: 'name-za', label: 'Name: Z → A' },
]

const activeSortLabel = computed(() => sortOptions.find(o => o.value === activeSort.value)?.label ?? 'Newest first')

function handleSortDropdownOutside(e: MouseEvent) {
  if (sortDropdownRef.value && !sortDropdownRef.value.contains(e.target as Node)) {
    sortDropdownOpen.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', handleSortDropdownOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleSortDropdownOutside))

// ── Filtered + sorted list ────────────────────────────────────────────────────

const filteredApplications = computed(() => {
  let list = [...applications.value]

  // Job filter
  if (activeJobId.value) {
    list = list.filter(app => app.jobId === activeJobId.value)
  }

  // Search filter (client-side)
  if (debouncedSearch.value) {
    const q = debouncedSearch.value
    list = list.filter(app =>
      `${app.candidateFirstName} ${app.candidateLastName}`.toLowerCase().includes(q)
      || app.candidateEmail.toLowerCase().includes(q)
      || app.jobTitle.toLowerCase().includes(q),
    )
  }

  // Sort
  list.sort((a, b) => {
    switch (activeSort.value) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'score-high':
        return (b.score ?? -1) - (a.score ?? -1)
      case 'score-low':
        return (a.score ?? -1) - (b.score ?? -1)
      case 'name-az':
        return `${a.candidateFirstName} ${a.candidateLastName}`.localeCompare(`${b.candidateFirstName} ${b.candidateLastName}`)
      case 'name-za':
        return `${b.candidateFirstName} ${b.candidateLastName}`.localeCompare(`${a.candidateFirstName} ${a.candidateLastName}`)
      default:
        return 0
    }
  })

  return list
})

const hasActiveFilters = computed(() =>
  activeStatus.value != null || activeJobId.value != null || debouncedSearch.value.length > 0,
)

function clearAllFilters() {
  activeStatus.value = undefined
  activeJobId.value = undefined
  searchInput.value = ''
  debouncedSearch.value = ''
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

function candidateInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function initialsColor(name: string) {
  const colors = [
    'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300',
    'bg-info-100 text-info-700 dark:bg-info-900 dark:text-info-300',
    'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
    'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300',
    'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function scoreClass(score: number) {
  if (score >= 75) return 'bg-success-50 text-success-700 ring-success-200 dark:bg-success-950 dark:text-success-400 dark:ring-success-800'
  if (score >= 40) return 'bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-950 dark:text-warning-400 dark:ring-warning-800'
  return 'bg-danger-50 text-danger-700 ring-danger-200 dark:bg-danger-950 dark:text-danger-400 dark:ring-danger-800'
}

const statusBadgeClasses: Record<string, string> = {
  new: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400',
  screening: 'bg-info-50 text-info-700 dark:bg-info-950 dark:text-info-400',
  interview: 'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-400',
  offer: 'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-400',
  hired: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-300',
  rejected: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400',
}

const statusDotClasses: Record<string, string> = {
  new: 'bg-brand-500',
  screening: 'bg-info-500',
  interview: 'bg-warning-500',
  offer: 'bg-success-500',
  hired: 'bg-success-600',
  rejected: 'bg-surface-400 dark:bg-surface-500',
}

const statusLabels: Record<Status, string> = {
  new: 'New',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Applications</h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Track candidates through your hiring pipeline.
        </p>
      </div>
    </div>

    <!-- Search bar -->
    <div class="relative mb-4">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-surface-400" />
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search by candidate name, email, or job title…"
        class="w-full rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 pl-10 pr-3 py-2.5 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
      />
    </div>

    <!-- Filter bar -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <!-- Job dropdown filter -->
      <div ref="jobDropdownRef" class="relative">
        <button
          class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors"
          :class="activeJobId
            ? 'border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400'
            : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-300 hover:border-surface-300 dark:hover:border-surface-700'"
          @click="jobDropdownOpen = !jobDropdownOpen"
        >
          <Briefcase class="size-3.5" />
          {{ activeJobId ? uniqueJobs.find(j => j.id === activeJobId)?.title ?? 'Job' : 'Job' }}
          <ChevronDown class="size-3.5" />
        </button>
        <div
          v-if="jobDropdownOpen"
          class="absolute left-0 top-full mt-1 z-20 w-64 max-h-56 overflow-y-auto rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-lg py-1"
        >
          <button
            class="w-full text-left px-3 py-2 text-sm hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            :class="!activeJobId ? 'text-brand-600 font-medium' : 'text-surface-700 dark:text-surface-300'"
            @click="activeJobId = undefined; jobDropdownOpen = false"
          >
            All jobs
          </button>
          <button
            v-for="j in uniqueJobs"
            :key="j.id"
            class="w-full text-left px-3 py-2 text-sm hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors truncate"
            :class="activeJobId === j.id ? 'text-brand-600 font-medium' : 'text-surface-700 dark:text-surface-300'"
            @click="activeJobId = j.id; jobDropdownOpen = false"
          >
            {{ j.title }}
          </button>
        </div>
      </div>

      <!-- Status filter tabs -->
      <div class="flex items-center gap-1">
        <button
          class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          :class="!activeStatus
            ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900'
            : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'"
          @click="activeStatus = undefined"
        >
          All
        </button>
        <button
          v-for="s in STATUS_OPTIONS"
          :key="s"
          class="rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors"
          :class="activeStatus === s
            ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900'
            : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'"
          @click="activeStatus = activeStatus === s ? undefined : s"
        >
          {{ statusLabels[s] }}
        </button>
      </div>

      <!-- Clear all -->
      <button
        v-if="hasActiveFilters"
        class="inline-flex items-center gap-1 text-xs text-surface-400 hover:text-danger-600 transition-colors ml-auto"
        @click="clearAllFilters"
      >
        <X class="size-3" />
        Clear filters
      </button>
    </div>

    <!-- Results bar -->
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">
        {{ filteredApplications.length }} application{{ filteredApplications.length === 1 ? '' : 's' }}
      </p>

      <!-- Sort dropdown -->
      <div ref="sortDropdownRef" class="relative">
        <button
          class="inline-flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
          @click="sortDropdownOpen = !sortDropdownOpen"
        >
          {{ activeSortLabel }}
          <ChevronDown class="size-3" />
        </button>
        <div
          v-if="sortDropdownOpen"
          class="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-lg py-1"
        >
          <button
            v-for="opt in sortOptions"
            :key="opt.value"
            class="w-full text-left px-3 py-2 text-sm hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            :class="activeSort === opt.value ? 'text-brand-600 font-medium' : 'text-surface-700 dark:text-surface-300'"
            @click="activeSort = opt.value; sortDropdownOpen = false"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-16 text-surface-400">
      Loading applications…
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
    >
      Failed to load applications. Please try again.
      <button class="underline ml-1" @click="refresh()">Retry</button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="applications.length === 0"
      class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-16 text-center"
    >
      <FileText class="size-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-surface-700 dark:text-surface-200 mb-1">No applications yet</h3>
      <p class="text-sm text-surface-500 dark:text-surface-400">
        Applications will appear here when candidates apply to your jobs or when you manually link candidates.
      </p>
    </div>

    <!-- No results after filtering -->
    <div
      v-else-if="filteredApplications.length === 0"
      class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-12 text-center"
    >
      <Search class="size-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-surface-700 dark:text-surface-200 mb-1">No matching applications</h3>
      <p class="text-sm text-surface-500 dark:text-surface-400 mb-3">
        Try adjusting your search or filters.
      </p>
      <button
        class="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
        @click="clearAllFilters"
      >
        Clear all filters
      </button>
    </div>

    <!-- Application cards -->
    <div v-else class="space-y-2">
      <NuxtLink
        v-for="app in filteredApplications"
        :key="app.id"
        :to="`/dashboard/applications/${app.id}`"
        class="flex items-start gap-4 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 py-4 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm transition-all group"
      >
        <!-- Avatar -->
        <div
          class="size-10 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold select-none"
          :class="initialsColor(`${app.candidateFirstName} ${app.candidateLastName}`)"
        >
          {{ candidateInitials(app.candidateFirstName, app.candidateLastName) }}
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <!-- Row 1: name + badges -->
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100 group-hover:text-brand-600 transition-colors truncate">
              {{ app.candidateFirstName }} {{ app.candidateLastName }}
            </h3>
            <!-- Status badge -->
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize"
              :class="statusBadgeClasses[app.status] ?? 'bg-surface-100 text-surface-600'"
            >
              <span class="size-1.5 rounded-full" :class="statusDotClasses[app.status] ?? 'bg-surface-400'" />
              {{ statusLabels[app.status as Status] ?? app.status }}
            </span>
            <!-- Score badge -->
            <span
              v-if="app.score != null"
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset"
              :class="scoreClass(app.score)"
            >
              {{ app.score }}%
            </span>
          </div>

          <!-- Row 2: job title -->
          <div class="flex items-center gap-1.5 mt-1 text-sm text-surface-600 dark:text-surface-300">
            <Briefcase class="size-3.5 shrink-0 text-surface-400" />
            <span class="truncate">{{ app.jobTitle }}</span>
          </div>

          <!-- Row 3: email + time -->
          <div class="flex items-center gap-3 mt-1.5 text-xs text-surface-400">
            <span class="inline-flex items-center gap-1">
              <Mail class="size-3" />
              {{ app.candidateEmail }}
            </span>
            <span class="inline-flex items-center gap-1">
              <Clock class="size-3" />
              {{ timeAgo(app.createdAt) }}
            </span>
          </div>
        </div>
      </NuxtLink>

      <!-- Footer count -->
      <p class="text-xs text-surface-400 pt-2">
        Showing {{ filteredApplications.length }} of {{ total }} application{{ total === 1 ? '' : 's' }}
      </p>
    </div>
  </div>
</template>
