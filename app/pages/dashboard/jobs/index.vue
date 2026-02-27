<script setup lang="ts">
import { Briefcase, Plus, MapPin, LayoutList, LayoutGrid } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Jobs — Reqcore',
  description: 'Manage your job postings',
})

const route = useRoute()
const router = useRouter()

// Sync statusFilter with ?status= query param
const validStatuses = ['draft', 'open', 'closed', 'archived'] as const
type Status = (typeof validStatuses)[number]

const isValidStatus = (value: unknown): value is Status =>
  typeof value === 'string' && (validStatuses as readonly string[]).includes(value)

const initialStatus = isValidStatus(route.query.status) ? route.query.status : undefined
const statusFilter = ref<Status | undefined>(initialStatus)
// Sync viewMode with ?view= query param
const initialView = route.query.view === 'gallery' ? 'gallery' : 'list'
const viewMode = ref<'list' | 'gallery'>(initialView)

// Keep URL in sync when statusFilter or viewMode change
watch([statusFilter, viewMode], ([newStatus, newView]) => {
  const query: Record<string, string> = {}
  if (newStatus) query.status = newStatus
  if (newView !== 'list') query.view = newView
  router.replace({ query })
})

const { jobs, total, fetchStatus, error, refresh } = useJobs({ status: statusFilter })

const statusTabs = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' },
] as const

const statusBadgeClasses: Record<string, string> = {
  draft: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400',
  open: 'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-400',
  closed: 'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-400',
  archived: 'bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500',
}

const typeLabels: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Jobs</h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Manage your open positions and job postings.
        </p>
      </div>
      <NuxtLink
        to="/dashboard/jobs/new"
        class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        <Plus class="size-4" />
        Create Job
      </NuxtLink>
    </div>

    <!-- Status filter tabs + view toggle -->
    <div class="flex items-center justify-between mb-6 border-b border-surface-200 dark:border-surface-800">
      <div class="flex gap-1">
        <button
          v-for="tab in statusTabs"
          :key="tab.label"
          class="cursor-pointer px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
          :class="statusFilter === tab.value
            ? 'border-brand-600 text-brand-600'
            : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:hover:text-surface-300 dark:hover:border-surface-600'"
          @click="statusFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- View toggle -->
      <div class="flex items-center gap-1 -mb-px pb-2">
        <button
          class="cursor-pointer rounded p-1.5 transition-colors"
          :class="viewMode === 'list'
            ? 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200'
            : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'"
          title="List view"
          @click="viewMode = 'list'"
        >
          <LayoutList class="size-4" />
        </button>
        <button
          class="cursor-pointer rounded p-1.5 transition-colors"
          :class="viewMode === 'gallery'
            ? 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200'
            : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'"
          title="Gallery view"
          @click="viewMode = 'gallery'"
        >
          <LayoutGrid class="size-4" />
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-12 text-surface-400">
      Loading jobs…
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
    >
      Failed to load jobs. Please try again.
      <button class="underline ml-1" @click="refresh()">Retry</button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="jobs.length === 0"
      class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-12 text-center"
    >
      <Briefcase class="size-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-surface-700 dark:text-surface-200 mb-1">No jobs yet</h3>
      <p class="text-sm text-surface-500 dark:text-surface-400 mb-4">
        Create your first job posting to start building your recruitment pipeline.
      </p>
      <NuxtLink
        to="/dashboard/jobs/new"
        class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        <Plus class="size-4" />
        Create Job
      </NuxtLink>
    </div>

    <!-- List view -->
    <div v-else-if="viewMode === 'list'" class="space-y-2">
      <NuxtLink
        v-for="j in jobs"
        :key="j.id"
        :to="`/dashboard/jobs/${j.id}`"
        class="flex items-center justify-between rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 py-3 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm transition-all group"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100 group-hover:text-brand-600 transition-colors truncate">
              {{ j.title }}
            </h3>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
              :class="statusBadgeClasses[j.status] ?? 'bg-surface-100 text-surface-600'"
            >
              {{ j.status }}
            </span>
          </div>
          <div class="flex items-center gap-3 text-xs text-surface-400">
            <span>{{ typeLabels[j.type] ?? j.type }}</span>
            <span v-if="j.location" class="inline-flex items-center gap-1">
              <MapPin class="size-3" />
              {{ j.location }}
            </span>
            <span>{{ new Date(j.createdAt).toLocaleDateString() }}</span>
          </div>
        </div>
      </NuxtLink>

      <!-- Total count -->
      <p class="text-xs text-surface-400 pt-2">
        {{ total }} job{{ total === 1 ? '' : 's' }} total
      </p>
    </div>

    <!-- Gallery view -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <NuxtLink
        v-for="j in jobs"
        :key="j.id"
        :to="`/dashboard/jobs/${j.id}`"
        class="
          flex flex-col rounded-lg border border-surface-200 dark:border-surface-800
          bg-white dark:bg-surface-900 p-4
          hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm
          transition-all group
        "
      >
        <!-- Status badge -->
        <div class="flex items-center justify-between mb-3">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            :class="statusBadgeClasses[j.status] ?? 'bg-surface-100 text-surface-600'"
          >
            {{ j.status }}
          </span>
          <span class="text-xs text-surface-400">
            {{ new Date(j.createdAt).toLocaleDateString() }}
          </span>
        </div>

        <!-- Title -->
        <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100 group-hover:text-brand-600 transition-colors mb-2 line-clamp-2">
          {{ j.title }}
        </h3>

        <!-- Meta -->
        <div class="mt-auto flex flex-wrap items-center gap-2 text-xs text-surface-400">
          <span class="inline-flex items-center gap-1 rounded-md bg-surface-50 dark:bg-surface-800 px-1.5 py-0.5">
            {{ typeLabels[j.type] ?? j.type }}
          </span>
          <span v-if="j.location" class="inline-flex items-center gap-1">
            <MapPin class="size-3" />
            {{ j.location }}
          </span>
        </div>
      </NuxtLink>

      <!-- Total count -->
      <p class="col-span-full text-xs text-surface-400 pt-2">
        {{ total }} job{{ total === 1 ? '' : 's' }} total
      </p>
    </div>
  </div>
</template>
