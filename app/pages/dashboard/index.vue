<script setup lang="ts">
import {
  Briefcase, Users, Inbox, Bell,
  Plus, UserPlus, ArrowRight, Calendar,
  FileEdit, Eye, Send, Handshake, UserCheck, UserX,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Dashboard — Reqcore',
  description: 'Your recruitment overview',
})

const { activeOrg } = useCurrentOrg()
const {
  counts,
  pipeline,
  jobsByStatus,
  recentApplications,
  topJobs,
  fetchStatus,
  error,
  refresh,
} = useDashboard()

// ─────────────────────────────────────────────
// Status display config
// ─────────────────────────────────────────────

const applicationStatusConfig: Record<string, { label: string; color: string; bg: string; icon: ReturnType<typeof Object> }> = {
  new: { label: 'New', color: 'text-warning-700 dark:text-warning-400', bg: 'bg-warning-500', icon: Bell },
  screening: { label: 'Screening', color: 'text-info-700 dark:text-info-400', bg: 'bg-info-500', icon: FileEdit },
  interview: { label: 'Interview', color: 'text-brand-700 dark:text-brand-400', bg: 'bg-brand-500', icon: Eye },
  offer: { label: 'Offer', color: 'text-accent-700 dark:text-accent-400', bg: 'bg-accent-500', icon: Send },
  hired: { label: 'Hired', color: 'text-success-700 dark:text-success-400', bg: 'bg-success-500', icon: UserCheck },
  rejected: { label: 'Rejected', color: 'text-danger-700 dark:text-danger-400', bg: 'bg-danger-400', icon: UserX },
}

const applicationStatusBadgeClasses: Record<string, string> = {
  new: 'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-400',
  screening: 'bg-info-50 text-info-700 dark:bg-info-950 dark:text-info-400',
  interview: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400',
  offer: 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-400',
  hired: 'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-400',
  rejected: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400',
}

const jobStatusBadgeClasses: Record<string, string> = {
  draft: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400',
  open: 'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-400',
  closed: 'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-400',
  archived: 'bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500',
}

// ─────────────────────────────────────────────
// Pipeline bar computation
// ─────────────────────────────────────────────

const pipelineTotal = computed(() =>
  Object.values(pipeline.value).reduce((sum, n) => sum + n, 0),
)

const pipelineSegments = computed(() => {
  if (pipelineTotal.value === 0) return []
  return Object.entries(applicationStatusConfig).map(([status, config]) => ({
    status,
    label: config.label,
    count: (pipeline.value as Record<string, number>)[status] ?? 0,
    pct: Math.round(((pipeline.value as Record<string, number>)[status] ?? 0) / pipelineTotal.value * 100),
    bg: config.bg,
    color: config.color,
  })).filter(s => s.count > 0)
})

// ─────────────────────────────────────────────
// Stat cards config
// ─────────────────────────────────────────────

const statCards = computed(() => [
  {
    label: 'Open Jobs',
    value: counts.value.openJobs,
    icon: Briefcase,
    to: '/dashboard/jobs?status=open',
    iconColor: 'text-brand-500',
    bgColor: 'bg-brand-50 dark:bg-brand-950',
  },
  {
    label: 'Total Candidates',
    value: counts.value.totalCandidates,
    icon: Users,
    to: '/dashboard/candidates',
    iconColor: 'text-accent-500',
    bgColor: 'bg-accent-50 dark:bg-accent-950',
  },
  {
    label: 'Applications',
    value: counts.value.totalApplications,
    icon: Inbox,
    to: '/dashboard/applications',
    iconColor: 'text-info-500',
    bgColor: 'bg-info-50 dark:bg-info-950',
  },
  {
    label: 'Unreviewed',
    value: counts.value.newApplications,
    icon: Bell,
    to: '/dashboard/applications?status=new',
    iconColor: 'text-warning-500',
    bgColor: 'bg-warning-50 dark:bg-warning-950',
  },
])

// ─────────────────────────────────────────────
// Relative time formatting
// ─────────────────────────────────────────────

function timeAgo(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 4) return `${weeks}w ago`
  return new Date(date).toLocaleDateString()
}

// ─────────────────────────────────────────────
// Empty state detection
// ─────────────────────────────────────────────

const isEmpty = computed(() =>
  counts.value.openJobs === 0
  && counts.value.totalCandidates === 0
  && counts.value.totalApplications === 0,
)
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <!-- ─── Header ─── -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Dashboard</h1>
        <p v-if="activeOrg" class="text-sm text-surface-500 dark:text-surface-400 mt-1">
          {{ activeOrg.name }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink
          to="/dashboard/jobs/new"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          <Plus class="size-4" />
          Create Job
        </NuxtLink>
        <NuxtLink
          to="/dashboard/candidates/new"
          class="inline-flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
        >
          <UserPlus class="size-4" />
          Add Candidate
        </NuxtLink>
      </div>
    </div>

    <!-- ─── Loading ─── -->
    <div v-if="fetchStatus === 'pending'">
      <!-- Skeleton stat cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
          v-for="i in 4"
          :key="i"
          class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 animate-pulse"
        >
          <div class="h-4 w-20 bg-surface-200 dark:bg-surface-700 rounded mb-3" />
          <div class="h-8 w-16 bg-surface-200 dark:bg-surface-700 rounded" />
        </div>
      </div>
      <!-- Skeleton sections -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 animate-pulse">
          <div class="h-5 w-40 bg-surface-200 dark:bg-surface-700 rounded mb-4" />
          <div class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-10 bg-surface-200 dark:bg-surface-700 rounded" />
          </div>
        </div>
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 animate-pulse">
          <div class="h-5 w-32 bg-surface-200 dark:bg-surface-700 rounded mb-4" />
          <div class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-10 bg-surface-200 dark:bg-surface-700 rounded" />
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Error ─── -->
    <div
      v-else-if="error"
      class="rounded-lg border border-danger-200 dark:border-danger-900 bg-danger-50 dark:bg-danger-950 p-4 text-sm text-danger-700 dark:text-danger-400"
    >
      Failed to load dashboard data.
      <button class="underline ml-1 cursor-pointer" @click="refresh()">Retry</button>
    </div>

    <!-- ─── Empty state (new org, no data) ─── -->
    <div v-else-if="isEmpty" class="flex flex-col items-center justify-center py-20">
      <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-10 text-center max-w-md">
        <Briefcase class="size-12 text-brand-400 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">
          Welcome to Reqcore
        </h2>
        <p class="text-sm text-surface-500 dark:text-surface-400 mb-6 leading-relaxed">
          Get started by creating your first job posting. Candidates and applications will appear here as they come in.
        </p>
        <NuxtLink
          to="/dashboard/jobs/new"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          <Plus class="size-4" />
          Create Your First Job
        </NuxtLink>
      </div>
    </div>

    <!-- ─── Dashboard content ─── -->
    <template v-else>
      <!-- ─── Stat cards ─── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <NuxtLink
          v-for="card in statCards"
          :key="card.label"
          :to="card.to"
          class="group rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm transition-all no-underline"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-medium uppercase tracking-wider text-surface-500 dark:text-surface-400">
              {{ card.label }}
            </span>
            <span class="rounded-lg p-2" :class="card.bgColor">
              <component :is="card.icon" class="size-4" :class="card.iconColor" />
            </span>
          </div>
          <div class="text-2xl font-bold text-surface-900 dark:text-surface-100">
            {{ card.value }}
          </div>
        </NuxtLink>
      </div>

      <!-- ─── Pipeline overview + Jobs by status ─── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- Pipeline breakdown -->
        <div class="lg:col-span-2 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-3">
              <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Pipeline Overview</h2>
              <span
                v-if="pipelineTotal > 0"
                class="inline-flex items-center rounded-full bg-surface-100 dark:bg-surface-800 px-2.5 py-0.5 text-xs font-semibold text-surface-600 dark:text-surface-300"
              >
                {{ pipelineTotal }} total
              </span>
            </div>
            <NuxtLink
              to="/dashboard/applications"
              class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors no-underline"
            >
              View all
            </NuxtLink>
          </div>

          <!-- Pipeline content -->
          <div v-if="pipelineTotal > 0">
            <!-- Segmented progress bar -->
            <div class="flex h-4 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-800 mb-6 gap-0.5">
              <NuxtLink
                v-for="segment in pipelineSegments"
                :key="segment.status"
                :to="`/dashboard/applications?status=${segment.status}`"
                :title="`${segment.label}: ${segment.count} (${segment.pct}%)`"
                class="transition-all duration-200 hover:opacity-80 hover:scale-y-110 origin-center no-underline first:rounded-l-lg last:rounded-r-lg"
                :class="segment.bg"
                :style="{ width: `${Math.max(segment.pct, 3)}%` }"
              />
            </div>

            <!-- Stage cards grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <NuxtLink
                v-for="(config, status) in applicationStatusConfig"
                :key="status"
                :to="`/dashboard/applications?status=${status}`"
                class="group/stage relative rounded-lg border border-surface-100 dark:border-surface-800 p-3 hover:border-surface-300 dark:hover:border-surface-600 hover:shadow-sm transition-all no-underline"
              >
                <!-- Subtle top accent line -->
                <div class="absolute inset-x-0 top-0 h-0.5 rounded-t-lg opacity-60 group-hover/stage:opacity-100 transition-opacity" :class="config.bg" />

                <div class="flex items-center gap-2 mb-2">
                  <span class="rounded-md p-1.5 bg-surface-50 dark:bg-surface-800 group-hover/stage:bg-surface-100 dark:group-hover/stage:bg-surface-700 transition-colors">
                    <component :is="config.icon" class="size-3.5" :class="config.color" />
                  </span>
                  <span class="text-xs font-medium text-surface-500 dark:text-surface-400 group-hover/stage:text-surface-700 dark:group-hover/stage:text-surface-200 transition-colors">
                    {{ config.label }}
                  </span>
                </div>

                <div class="flex items-baseline gap-1.5">
                  <span class="text-lg font-bold text-surface-900 dark:text-surface-100">
                    {{ (pipeline as Record<string, number>)[status] ?? 0 }}
                  </span>
                  <span
                    v-if="pipelineTotal > 0"
                    class="text-xs text-surface-400 dark:text-surface-500"
                  >
                    {{ Math.round(((pipeline as Record<string, number>)[status] ?? 0) / pipelineTotal * 100) }}%
                  </span>
                </div>
              </NuxtLink>
            </div>
          </div>

          <div v-else class="text-center py-8">
            <div class="rounded-full bg-surface-50 dark:bg-surface-800 p-3 w-fit mx-auto mb-3">
              <Inbox class="size-6 text-surface-300 dark:text-surface-600" />
            </div>
            <p class="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">No applications yet</p>
            <p class="text-xs text-surface-400 dark:text-surface-500">Applications will appear here as candidates apply.</p>
          </div>
        </div>

        <!-- Jobs by status -->
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Jobs</h2>
            <NuxtLink
              to="/dashboard/jobs"
              class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors no-underline"
            >
              View all
            </NuxtLink>
          </div>

          <div class="space-y-3">
            <NuxtLink
              v-for="(s, index) in (['open', 'draft', 'closed', 'archived'] as const)"
              :key="s"
              :to="`/dashboard/jobs?status=${s}`"
              class="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors no-underline"
            >
              <div class="flex items-center gap-2.5">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                  :class="jobStatusBadgeClasses[s]"
                >
                  {{ s }}
                </span>
              </div>
              <span class="text-lg font-semibold text-surface-900 dark:text-surface-100">
                {{ (jobsByStatus as Record<string, number>)[s] ?? 0 }}
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- ─── Recent applications + Top active jobs ─── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent applications -->
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Recent Applications</h2>
            <NuxtLink
              to="/dashboard/applications"
              class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors no-underline"
            >
              View all
            </NuxtLink>
          </div>

          <div v-if="recentApplications.length > 0" class="space-y-1">
            <NuxtLink
              v-for="app in recentApplications"
              :key="app.id"
              :to="`/dashboard/applications/${app.id}`"
              class="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors no-underline group"
            >
              <div class="min-w-0 flex-1 mr-3">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <span class="text-sm font-medium text-surface-900 dark:text-surface-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                    {{ app.candidateFirstName }} {{ app.candidateLastName }}
                  </span>
                  <span class="text-xs text-surface-400">→</span>
                  <span class="text-xs text-surface-500 dark:text-surface-400 truncate">
                    {{ app.jobTitle }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5 text-xs text-surface-400">
                  <Calendar class="size-3 shrink-0" />
                  {{ timeAgo(app.createdAt) }}
                </div>
              </div>
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 capitalize"
                :class="applicationStatusBadgeClasses[app.status] ?? 'bg-surface-100 text-surface-600'"
              >
                {{ app.status }}
              </span>
            </NuxtLink>
          </div>

          <div v-else class="text-center py-8">
            <Inbox class="size-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
            <p class="text-sm text-surface-400 dark:text-surface-500 mb-3">No applications yet.</p>
            <p class="text-xs text-surface-400 dark:text-surface-500 leading-relaxed">
              Applications appear here when candidates apply to your jobs or when you manually link candidates.
            </p>
          </div>
        </div>

        <!-- Top active jobs -->
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Active Jobs</h2>
            <NuxtLink
              to="/dashboard/jobs?status=open"
              class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors no-underline"
            >
              View all
            </NuxtLink>
          </div>

          <div v-if="topJobs.length > 0" class="space-y-1">
            <NuxtLink
              v-for="j in topJobs"
              :key="j.id"
              :to="`/dashboard/jobs/${j.id}`"
              class="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors no-underline group"
            >
              <div class="min-w-0 flex-1 mr-3">
                <div class="text-sm font-medium text-surface-900 dark:text-surface-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate mb-1">
                  {{ j.title }}
                </div>
                <div class="flex items-center gap-3 text-xs text-surface-400">
                  <span>{{ j.applicationCount }} application{{ j.applicationCount === 1 ? '' : 's' }}</span>
                  <span
                    v-if="j.newCount > 0"
                    class="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400 font-medium"
                  >
                    <Bell class="size-3" />
                    {{ j.newCount }} new
                  </span>
                </div>
              </div>
              <ArrowRight class="size-4 text-surface-300 dark:text-surface-600 group-hover:text-brand-500 transition-colors shrink-0" />
            </NuxtLink>
          </div>

          <div v-else class="text-center py-8">
            <Briefcase class="size-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
            <p class="text-sm text-surface-400 dark:text-surface-500 mb-3">No open jobs.</p>
            <NuxtLink
              to="/dashboard/jobs/new"
              class="inline-flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors no-underline"
            >
              <Plus class="size-4" />
              Create a job
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
