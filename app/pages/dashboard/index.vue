<script setup lang="ts">
import {
  Briefcase, Users, FileText, Calendar, Plus,
  ArrowRight, TrendingUp, Clock, AlertCircle,
  Eye, UserPlus, ExternalLink,
  LayoutDashboard, Zap,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Dashboard — Reqcore',
  description: 'Your recruiting command center',
})

const { activeOrg } = useCurrentOrg()
const localePath = useLocalePath()

// ─────────────────────────────────────────────
// Fetch dashboard stats
// ─────────────────────────────────────────────

const {
  counts,
  jobsByStatus,
  recentApplications,
  topJobs,
  fetchStatus,
  error,
  refresh,
} = useDashboard()

// ─────────────────────────────────────────────
// Upcoming interviews (next 7 days)
// ─────────────────────────────────────────────

const now = new Date()
const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

const { interviews: upcomingInterviews } = useInterviews({
  status: 'scheduled',
  from: now.toISOString(),
  to: weekFromNow.toISOString(),
  limit: 5,
})

// ─────────────────────────────────────────────
// Derived data
// ─────────────────────────────────────────────

const stageConfig = [
  { key: 'new', label: 'New', color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/40' },
  { key: 'screening', label: 'Screening', color: 'bg-violet-500', textColor: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-950/40' },
  { key: 'interview', label: 'Interview', color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/40' },
  { key: 'offer', label: 'Offer', color: 'bg-teal-500', textColor: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-950/40' },
  { key: 'hired', label: 'Hired', color: 'bg-green-600', textColor: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/40' },
  { key: 'rejected', label: 'Rejected', color: 'bg-surface-400', textColor: 'text-surface-500 dark:text-surface-400', bgColor: 'bg-surface-100 dark:bg-surface-800' },
] as const

const stageCountKeys: Record<string, string> = {
  new: 'newCount',
  screening: 'screeningCount',
  interview: 'interviewCount',
  offer: 'offerCount',
  hired: 'hiredCount',
  rejected: 'rejectedCount',
}

function getJobStageCount(job: (typeof topJobs.value)[number], stageKey: string): number {
  const key = stageCountKeys[stageKey]
  if (!key) return 0
  return (job as any)[key] ?? 0
}

function getJobActiveTotal(job: (typeof topJobs.value)[number]): number {
  return getJobStageCount(job, 'new')
    + getJobStageCount(job, 'screening')
    + getJobStageCount(job, 'interview')
    + getJobStageCount(job, 'offer')
}

const statusBadgeClasses: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-800/40',
  screening: 'bg-violet-50 text-violet-700 ring-violet-200/60 dark:bg-violet-950 dark:text-violet-400 dark:ring-violet-800/40',
  interview: 'bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-800/40',
  offer: 'bg-teal-50 text-teal-700 ring-teal-200/60 dark:bg-teal-950 dark:text-teal-400 dark:ring-teal-800/40',
  hired: 'bg-green-50 text-green-700 ring-green-200/60 dark:bg-green-950 dark:text-green-400 dark:ring-green-800/40',
  rejected: 'bg-surface-100 text-surface-600 ring-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:ring-surface-700',
}

const interviewTypeLabels: Record<string, string> = {
  phone: 'Phone',
  video: 'Video',
  in_person: 'In-person',
  panel: 'Panel',
  technical: 'Technical',
  take_home: 'Take-home',
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffDays === 0) {
    if (diffHours <= 0) return 'Now'
    return `In ${diffHours}h`
  }
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 7) return `In ${diffDays} days`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const isEmpty = computed(() =>
  counts.value.openJobs === 0
  && counts.value.totalCandidates === 0
  && counts.value.totalApplications === 0,
)
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <!-- ─── Loading skeleton ─── -->
    <div v-if="fetchStatus === 'pending'">
      <!-- Header skeleton -->
      <div class="mb-10">
        <div class="h-8 w-56 bg-surface-200 dark:bg-surface-700 rounded-lg animate-pulse mb-2" />
        <div class="h-4 w-40 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
      </div>
      <!-- Stats skeleton -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div v-for="i in 4" :key="i" class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 animate-pulse">
          <div class="h-4 w-20 bg-surface-200 dark:bg-surface-700 rounded mb-4" />
          <div class="h-9 w-14 bg-surface-200 dark:bg-surface-700 rounded" />
        </div>
      </div>
      <!-- Content skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 animate-pulse">
          <div class="h-5 w-32 bg-surface-200 dark:bg-surface-700 rounded mb-6" />
          <div class="space-y-4">
            <div v-for="i in 3" :key="i" class="h-20 bg-surface-100 dark:bg-surface-800 rounded-xl" />
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
      v-else-if="error"
      class="rounded-2xl border border-danger-200 dark:border-danger-900 bg-danger-50 dark:bg-danger-950/60 p-5 text-sm text-danger-700 dark:text-danger-400 flex items-center gap-3"
    >
      <AlertCircle class="size-5 shrink-0" />
      <span>Failed to load dashboard.</span>
      <button class="underline ml-auto font-medium cursor-pointer" @click="refresh()">Retry</button>
    </div>

    <!-- ─── Empty state (brand new org) ─── -->
    <div v-else-if="isEmpty" class="flex flex-col items-center justify-center py-24">
      <div class="rounded-3xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-14 text-center max-w-md shadow-sm">
        <div class="mx-auto mb-8 flex items-center justify-center size-18 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/20">
          <LayoutDashboard class="size-9 text-white" />
        </div>
        <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-3 tracking-tight">
          Welcome to Reqcore
        </h2>
        <p class="text-sm text-surface-500 dark:text-surface-400 mb-10 leading-relaxed max-w-sm mx-auto">
          Your recruiting command center. Create your first job posting to start building your hiring pipeline.
        </p>
        <NuxtLink
          :to="localePath('/dashboard/jobs/new')"
          class="inline-flex items-center gap-2.5 rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white hover:bg-brand-700 shadow-md shadow-brand-600/20 hover:shadow-lg hover:shadow-brand-600/25 transition-all no-underline"
        >
          <Plus class="size-4" />
          Create Your First Job
        </NuxtLink>
      </div>
    </div>

    <!-- ─── Dashboard content ─── -->
    <template v-else>
      <!-- ─── Header ─── -->
      <div class="flex items-center justify-between mb-10">
        <div>
          <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Dashboard</h1>
          <p v-if="activeOrg" class="text-sm text-surface-400 dark:text-surface-500 mt-1">
            {{ activeOrg.name }}
          </p>
        </div>
        <NuxtLink
          :to="localePath('/dashboard/jobs/new')"
          class="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 shadow-sm shadow-brand-600/15 hover:shadow-md hover:shadow-brand-600/20 transition-all no-underline"
        >
          <Plus class="size-4" />
          New Job
        </NuxtLink>
      </div>

      <!-- ─── Stat cards ─── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <!-- Open Jobs -->
        <NuxtLink
          :to="localePath('/dashboard/jobs')"
          class="group relative rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 hover:border-brand-300/60 dark:hover:border-brand-800/60 hover:shadow-md hover:shadow-brand-500/5 dark:hover:shadow-brand-500/5 transition-all duration-200 no-underline overflow-hidden"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-brand-50/50 to-transparent dark:from-brand-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div class="relative">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">Open Jobs</span>
              <div class="flex items-center justify-center size-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 group-hover:bg-brand-100 dark:group-hover:bg-brand-950/60 transition-colors">
                <Briefcase class="size-4 text-brand-600 dark:text-brand-400" />
              </div>
            </div>
            <div class="text-3xl font-bold text-surface-900 dark:text-surface-50 tracking-tight tabular-nums">
              {{ counts.openJobs }}
            </div>
            <p class="text-xs text-surface-400 mt-1.5">
              {{ jobsByStatus.draft }} draft{{ jobsByStatus.draft === 1 ? '' : 's' }}
            </p>
          </div>
        </NuxtLink>

        <!-- Total Candidates -->
        <NuxtLink
          :to="localePath('/dashboard/candidates')"
          class="group relative rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 hover:border-violet-300/60 dark:hover:border-violet-800/60 hover:shadow-md hover:shadow-violet-500/5 dark:hover:shadow-violet-500/5 transition-all duration-200 no-underline overflow-hidden"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div class="relative">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">Candidates</span>
              <div class="flex items-center justify-center size-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 group-hover:bg-violet-100 dark:group-hover:bg-violet-950/60 transition-colors">
                <Users class="size-4 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div class="text-3xl font-bold text-surface-900 dark:text-surface-50 tracking-tight tabular-nums">
              {{ counts.totalCandidates }}
            </div>
            <p class="text-xs text-surface-400 mt-1.5">Talent pool</p>
          </div>
        </NuxtLink>

        <!-- Total Applications -->
        <NuxtLink
          :to="localePath('/dashboard/applications')"
          class="group relative rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 hover:border-teal-300/60 dark:hover:border-teal-800/60 hover:shadow-md hover:shadow-teal-500/5 dark:hover:shadow-teal-500/5 transition-all duration-200 no-underline overflow-hidden"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div class="relative">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">Applications</span>
              <div class="flex items-center justify-center size-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 group-hover:bg-teal-100 dark:group-hover:bg-teal-950/60 transition-colors">
                <FileText class="size-4 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
            <div class="text-3xl font-bold text-surface-900 dark:text-surface-50 tracking-tight tabular-nums">
              {{ counts.totalApplications }}
            </div>
            <p class="text-xs text-surface-400 mt-1.5">Total received</p>
          </div>
        </NuxtLink>

        <!-- To Review -->
        <NuxtLink
          :to="localePath({ path: '/dashboard/applications', query: { status: 'new' } })"
          class="group relative rounded-2xl border bg-white dark:bg-surface-900 p-5 hover:shadow-md transition-all duration-200 no-underline overflow-hidden"
          :class="counts.newApplications > 0
            ? 'border-warning-200 dark:border-warning-900/50 hover:border-warning-300/80 dark:hover:border-warning-800/60 hover:shadow-warning-500/5'
            : 'border-surface-200/80 dark:border-surface-800 hover:border-surface-300/60 dark:hover:border-surface-700 hover:shadow-surface-500/5'"
        >
          <div
            class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            :class="counts.newApplications > 0
              ? 'bg-gradient-to-br from-warning-50/50 to-transparent dark:from-warning-950/20 dark:to-transparent'
              : 'bg-gradient-to-br from-surface-50/50 to-transparent dark:from-surface-800/20 dark:to-transparent'"
          />
          <div class="relative">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">To Review</span>
              <div
                class="flex items-center justify-center size-9 rounded-xl transition-colors"
                :class="counts.newApplications > 0
                  ? 'bg-warning-50 dark:bg-warning-950/40 group-hover:bg-warning-100 dark:group-hover:bg-warning-950/60'
                  : 'bg-surface-100 dark:bg-surface-800 group-hover:bg-surface-200/80 dark:group-hover:bg-surface-700'"
              >
                <AlertCircle class="size-4" :class="counts.newApplications > 0 ? 'text-warning-600 dark:text-warning-400' : 'text-surface-400'" />
              </div>
            </div>
            <div
              class="text-3xl font-bold tracking-tight tabular-nums"
              :class="counts.newApplications > 0
                ? 'text-warning-700 dark:text-warning-400'
                : 'text-surface-900 dark:text-surface-50'"
            >
              {{ counts.newApplications }}
            </div>
            <p class="text-xs mt-1.5" :class="counts.newApplications > 0 ? 'text-warning-600 dark:text-warning-400 font-medium' : 'text-surface-400'">
              {{ counts.newApplications > 0 ? 'Needs attention' : 'All reviewed' }}
            </p>
          </div>
        </NuxtLink>
      </div>

      <!-- ─── Main content grid ─── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- ─── Left column (2/3) ─── -->
        <div class="lg:col-span-2 space-y-6">
          <!-- ─── Pipeline overview (per job) ─── -->
          <div class="rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-xs dark:shadow-none">
            <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800">
              <div class="flex items-center gap-2.5">
                <div class="flex items-center justify-center size-7 rounded-lg bg-surface-100 dark:bg-surface-800">
                  <TrendingUp class="size-3.5 text-surface-500 dark:text-surface-400" />
                </div>
                <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Hiring Pipeline</h2>
              </div>
              <NuxtLink
                :to="localePath('/dashboard/jobs')"
                class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 no-underline inline-flex items-center gap-1 group/link"
              >
                All jobs
                <ArrowRight class="size-3 group-hover/link:translate-x-0.5 transition-transform" />
              </NuxtLink>
            </div>

            <div v-if="topJobs.length === 0" class="px-6 py-12 text-center">
              <div class="mx-auto mb-4 flex items-center justify-center size-12 rounded-2xl bg-surface-100 dark:bg-surface-800">
                <Briefcase class="size-5 text-surface-400 dark:text-surface-500" />
              </div>
              <p class="text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">No open jobs</p>
              <p class="text-xs text-surface-400 dark:text-surface-500 mb-4">Create your first job to see the pipeline</p>
              <NuxtLink
                :to="localePath('/dashboard/jobs/new')"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 no-underline hover:text-brand-700 dark:hover:text-brand-300"
              >
                <Plus class="size-3.5" />
                Create one
              </NuxtLink>
            </div>

            <div v-else class="divide-y divide-surface-100 dark:divide-surface-800">
              <div v-for="j in topJobs" :key="j.id" class="px-6 py-5 group/job">
                <!-- Job title row -->
                <div class="flex items-center justify-between mb-3">
                  <NuxtLink
                    :to="localePath(`/dashboard/jobs/${j.id}`)"
                    class="text-sm font-semibold text-surface-900 dark:text-surface-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors no-underline truncate"
                  >
                    {{ j.title }}
                  </NuxtLink>
                  <span class="text-xs text-surface-400 dark:text-surface-500 shrink-0 ml-3 tabular-nums font-medium">
                    {{ j.applicationCount }} total
                  </span>
                </div>

                <!-- Pipeline bar for this job -->
                <div v-if="getJobActiveTotal(j) > 0" class="mb-3.5">
                  <div class="flex h-1.5 rounded-full overflow-hidden bg-surface-100 dark:bg-surface-800">
                    <div
                      v-for="stage in stageConfig.slice(0, 4).filter(s => getJobStageCount(j, s.key) > 0)"
                      :key="stage.key"
                      class="transition-all duration-500"
                      :class="stage.color"
                      :style="{ width: `${(getJobStageCount(j, stage.key) / getJobActiveTotal(j)) * 100}%` }"
                    />
                  </div>
                </div>

                <!-- Stage counts for this job -->
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  <NuxtLink
                    v-for="stage in stageConfig"
                    :key="stage.key"
                    :to="localePath(`/dashboard/jobs/${j.id}?stage=${stage.key}`)"
                    class="rounded-lg px-2 py-1.5 text-center transition-all duration-150 no-underline hover:ring-1 hover:ring-brand-300/50 dark:hover:ring-brand-700/50 hover:shadow-sm"
                    :class="[stage.bgColor, getJobStageCount(j, stage.key) > 0 ? 'cursor-pointer' : 'opacity-50']"
                  >
                    <div class="text-sm font-bold tabular-nums" :class="stage.textColor">
                      {{ getJobStageCount(j, stage.key) }}
                    </div>
                    <div class="text-[10px] font-medium text-surface-500 dark:text-surface-400 leading-tight">
                      {{ stage.label }}
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>

          <!-- ─── Recent applications ─── -->
          <div class="rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-xs dark:shadow-none">
            <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800">
              <div class="flex items-center gap-2.5">
                <div class="flex items-center justify-center size-7 rounded-lg bg-surface-100 dark:bg-surface-800">
                  <Clock class="size-3.5 text-surface-500 dark:text-surface-400" />
                </div>
                <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Recent Applications</h2>
              </div>
              <NuxtLink
                :to="localePath('/dashboard/applications')"
                class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 no-underline inline-flex items-center gap-1 group/link"
              >
                View all
                <ArrowRight class="size-3 group-hover/link:translate-x-0.5 transition-transform" />
              </NuxtLink>
            </div>

            <div v-if="recentApplications.length === 0" class="px-6 py-12 text-center">
              <div class="mx-auto mb-4 flex items-center justify-center size-12 rounded-2xl bg-surface-100 dark:bg-surface-800">
                <FileText class="size-5 text-surface-400 dark:text-surface-500" />
              </div>
              <p class="text-sm font-medium text-surface-500 dark:text-surface-400">No applications yet</p>
            </div>

            <div v-else class="divide-y divide-surface-100 dark:divide-surface-800">
              <NuxtLink
                v-for="app in recentApplications"
                :key="app.id"
                :to="localePath(`/dashboard/applications/${app.id}`)"
                class="flex items-center gap-4 px-6 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors no-underline group"
              >
                <!-- Avatar -->
                <div class="flex items-center justify-center size-9 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/80 dark:to-brand-800/80 shrink-0 ring-1 ring-brand-200/50 dark:ring-brand-800/50">
                  <span class="text-xs font-bold text-brand-700 dark:text-brand-300">
                    {{ ((app.candidateFirstName?.[0] ?? '') + (app.candidateLastName?.[0] ?? '')).toUpperCase() }}
                  </span>
                </div>

                <!-- Info -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-sm font-medium text-surface-900 dark:text-surface-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {{ app.candidateFirstName }} {{ app.candidateLastName }}
                    </span>
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize shrink-0 ring-1 ring-inset"
                      :class="statusBadgeClasses[app.status] ?? 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400 ring-surface-200 dark:ring-surface-700'"
                    >
                      {{ app.status }}
                    </span>
                  </div>
                  <div class="text-xs text-surface-400 dark:text-surface-500 truncate">
                    {{ app.jobTitle }}
                  </div>
                </div>

                <!-- Time -->
                <span class="text-[11px] text-surface-400 dark:text-surface-500 shrink-0 tabular-nums font-medium">
                  {{ formatDate(app.createdAt) }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- ─── Right column (1/3) ─── -->
        <div class="space-y-6">
          <!-- ─── Upcoming interviews ─── -->
          <div class="rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-xs dark:shadow-none">
            <div class="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-800">
              <div class="flex items-center gap-2.5">
                <div class="flex items-center justify-center size-7 rounded-lg bg-surface-100 dark:bg-surface-800">
                  <Calendar class="size-3.5 text-surface-500 dark:text-surface-400" />
                </div>
                <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Upcoming Interviews</h2>
              </div>
              <NuxtLink
                :to="localePath('/dashboard/interviews')"
                class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 no-underline inline-flex items-center gap-1 group/link"
              >
                All
                <ArrowRight class="size-3 group-hover/link:translate-x-0.5 transition-transform" />
              </NuxtLink>
            </div>

            <div v-if="upcomingInterviews.length === 0" class="px-5 py-10 text-center">
              <div class="mx-auto mb-4 flex items-center justify-center size-12 rounded-2xl bg-surface-100 dark:bg-surface-800">
                <Calendar class="size-5 text-surface-400 dark:text-surface-500" />
              </div>
              <p class="text-sm font-medium text-surface-500 dark:text-surface-400 mb-0.5">No upcoming interviews</p>
              <p class="text-xs text-surface-400 dark:text-surface-500">Next 7 days</p>
            </div>

            <div v-else class="divide-y divide-surface-100 dark:divide-surface-800">
              <NuxtLink
                v-for="interview in upcomingInterviews"
                :key="interview.id"
                :to="localePath(`/dashboard/interviews/${interview.id}`)"
                class="block px-5 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors no-underline group"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-sm font-medium text-surface-900 dark:text-surface-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {{ interview.candidateFirstName }} {{ interview.candidateLastName }}
                  </span>
                  <span class="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:text-brand-400 shrink-0 ml-2">
                    {{ formatRelativeDate(interview.scheduledAt) }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs text-surface-400 dark:text-surface-500">
                  <span class="font-medium">{{ formatTime(interview.scheduledAt) }}</span>
                  <span class="text-surface-200 dark:text-surface-700">·</span>
                  <span>{{ interviewTypeLabels[interview.type] ?? interview.type }}</span>
                  <span class="text-surface-200 dark:text-surface-700">·</span>
                  <span class="truncate">{{ interview.jobTitle }}</span>
                  <a
                    v-if="interview.googleCalendarEventLink"
                    :href="interview.googleCalendarEventLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors shrink-0 ml-auto"
                    @click.stop
                  >
                    <Calendar class="size-2.5" />
                    Google Calendar
                    <ExternalLink class="size-2" />
                  </a>
                </div>
              </NuxtLink>
            </div>
          </div>

          <!-- ─── Quick actions ─── -->
          <div class="rounded-2xl border border-surface-200/80 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-xs dark:shadow-none">
            <div class="flex items-center gap-2.5 px-5 py-4 border-b border-surface-100 dark:border-surface-800">
              <div class="flex items-center justify-center size-7 rounded-lg bg-surface-100 dark:bg-surface-800">
                <Zap class="size-3.5 text-surface-500 dark:text-surface-400" />
              </div>
              <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Quick Actions</h2>
            </div>

            <div class="p-2.5 space-y-0.5">
              <NuxtLink
                :to="localePath('/dashboard/jobs/new')"
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-700 dark:hover:text-brand-300 transition-all no-underline group/action"
              >
                <div class="flex items-center justify-center size-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 group-hover/action:bg-brand-100 dark:group-hover/action:bg-brand-950/60 transition-colors">
                  <Plus class="size-4 text-brand-600 dark:text-brand-400" />
                </div>
                Create new job
              </NuxtLink>
              <NuxtLink
                :to="localePath('/dashboard/candidates/new')"
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:text-violet-700 dark:hover:text-violet-300 transition-all no-underline group/action"
              >
                <div class="flex items-center justify-center size-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 group-hover/action:bg-violet-100 dark:group-hover/action:bg-violet-950/60 transition-colors">
                  <UserPlus class="size-4 text-violet-600 dark:text-violet-400" />
                </div>
                Add candidate
              </NuxtLink>
              <NuxtLink
                :to="localePath('/dashboard/applications')"
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:text-teal-700 dark:hover:text-teal-300 transition-all no-underline group/action"
              >
                <div class="flex items-center justify-center size-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 group-hover/action:bg-teal-100 dark:group-hover/action:bg-teal-950/60 transition-colors">
                  <Eye class="size-4 text-teal-600 dark:text-teal-400" />
                </div>
                Review applications
              </NuxtLink>
              <NuxtLink
                :to="localePath('/dashboard/interviews')"
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-700 dark:hover:text-amber-300 transition-all no-underline group/action"
              >
                <div class="flex items-center justify-center size-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 group-hover/action:bg-amber-100 dark:group-hover/action:bg-amber-950/60 transition-colors">
                  <Calendar class="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                View interviews
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
