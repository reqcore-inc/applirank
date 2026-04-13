<script setup lang="ts">
import {
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  FileText,
  Clock,
  LogIn,
  Shield,
  Globe,
  Bookmark,
  RefreshCw,
  Eye,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'portal',
})

const route = useRoute()
const token = computed(() => route.params.token as string)

// Whether the user just submitted their application (redirected with ?fresh=1)
const isFreshSubmission = computed(() => route.query.fresh === '1')
const bookmarkBannerDismissed = ref(false)

const { data, error, status, refresh } = await useFetch(`/api/portal/token/${token.value}`, {
  key: `portal-token-${token.value}`,
})

// Check if user has a portal session (for showing "save to account" prompt)
const { data: sessionData } = await useFetch('/api/portal/auth/session')

const isAuthenticated = computed(() => sessionData.value?.authenticated)

// Auto-refresh polling every 30 seconds
const isRefreshing = ref(false)
let pollInterval: ReturnType<typeof setInterval> | null = null

async function manualRefresh() {
  isRefreshing.value = true
  try {
    await refresh()
  } finally {
    isRefreshing.value = false
  }
}

onMounted(() => {
  pollInterval = setInterval(async () => {
    await refresh()
  }, 30_000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

// SEO
useHead({
  title: data.value ? `${data.value.job.title} — Application Status` : 'Application Portal',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getRelativeTime(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}
</script>

<template>
  <!-- Error state -->
  <div v-if="error" class="flex flex-col items-center justify-center py-20 text-center">
    <div class="size-16 rounded-full bg-danger-50 dark:bg-danger-900/30 flex items-center justify-center mb-4">
      <Shield class="size-8 text-danger-500" />
    </div>
    <h1 class="text-xl font-bold text-surface-900 dark:text-surface-100">Access Link Invalid</h1>
    <p class="mt-2 text-sm text-surface-500 dark:text-surface-400 max-w-md">
      This link may have expired or is no longer valid. If you signed in with Google, you can access your applications from the portal dashboard.
    </p>
    <NuxtLink
      to="/portal/auth/sign-in"
      class="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 transition-colors"
    >
      <LogIn class="size-4" />
      Sign in to view your applications
    </NuxtLink>
  </div>

  <!-- Loading state -->
  <div v-else-if="status === 'pending'" class="flex items-center justify-center py-20">
    <div class="animate-spin size-8 border-2 border-brand-500 border-t-transparent rounded-full" />
  </div>

  <!-- Dashboard content -->
  <div v-else-if="data" class="space-y-6">
    <!-- Bookmark banner (shown when arriving from fresh submission) -->
    <div
      v-if="isFreshSubmission && !bookmarkBannerDismissed"
      class="rounded-xl border border-success-200 dark:border-success-800 bg-success-50/50 dark:bg-success-950/20 p-4 sm:p-5"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="size-8 rounded-lg bg-success-100 dark:bg-success-900/40 flex items-center justify-center shrink-0">
            <Bookmark class="size-4 text-success-600 dark:text-success-400" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-success-700 dark:text-success-300">Application submitted successfully!</h3>
            <p class="mt-0.5 text-sm text-success-600 dark:text-success-400">
              Bookmark this page (<kbd class="rounded bg-success-100 dark:bg-success-900/50 px-1 py-0.5 text-xs font-mono">Ctrl+D</kbd>) to check your application status anytime. This is your personal dashboard — it updates automatically as your application progresses.
            </p>
          </div>
        </div>
        <button
          class="shrink-0 text-success-400 hover:text-success-600 dark:hover:text-success-300 transition-colors"
          @click="bookmarkBannerDismissed = true"
        >
          <span class="sr-only">Dismiss</span>
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <!-- Header card -->
    <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden">
      <!-- Gradient accent bar -->
      <div class="h-1.5 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-600" />

      <div class="p-5 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex items-start gap-4">
            <!-- Company logo -->
            <div class="size-12 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                v-if="data.organization.logo"
                :src="data.organization.logo"
                :alt="data.organization.name"
                class="size-full object-cover"
              />
              <Building2 v-else class="size-6 text-surface-400" />
            </div>

            <div>
              <h1 class="text-lg sm:text-xl font-bold text-surface-900 dark:text-surface-100">
                {{ data.job.title }}
              </h1>
              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-surface-500 dark:text-surface-400">
                <span class="flex items-center gap-1">
                  <Building2 class="size-3.5" />
                  {{ data.organization.name }}
                </span>
                <span v-if="data.job.location" class="flex items-center gap-1">
                  <MapPin class="size-3.5" />
                  {{ data.job.location }}
                </span>
                <span class="flex items-center gap-1">
                  <Briefcase class="size-3.5" />
                  {{ data.job.type }}
                </span>
                <span v-if="data.job.remoteStatus" class="flex items-center gap-1">
                  <Globe class="size-3.5" />
                  {{ data.job.remoteStatus }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              :disabled="isRefreshing"
              @click="manualRefresh"
            >
              <RefreshCw class="size-3.5" :class="{ 'animate-spin': isRefreshing }" />
              {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
            </button>
            <PortalStatusBadge :status="data.application.status" />
          </div>
        </div>

        <!-- Applied date & recruiter viewed -->
        <div class="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800 flex flex-col gap-2 text-sm text-surface-500 dark:text-surface-400">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
            <span class="flex items-center gap-1.5">
              <Calendar class="size-3.5 shrink-0" />
              <span class="truncate">Applied {{ formatDateTime(data.application.appliedAt) }}</span>
              <span class="hidden sm:inline text-surface-300 dark:text-surface-600">&middot;</span>
              <span class="hidden sm:inline">{{ getRelativeTime(data.application.appliedAt) }}</span>
            </span>
            <span v-if="data.application.lastUpdated" class="flex items-center gap-1.5">
              <Clock class="size-3.5 shrink-0" />
              <span class="truncate">Updated {{ formatDateTime(data.application.lastUpdated) }}</span>
            </span>
          </div>
          <!-- Recruiter viewed indicator -->
          <div v-if="data.application.viewedAt" class="flex items-center gap-1.5 text-xs text-success-600 dark:text-success-400">
            <Eye class="size-3.5" />
            Viewed by hiring team on {{ formatDateTime(data.application.viewedAt) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Save to account prompt (only if not signed in) -->
    <div
      v-if="!isAuthenticated"
      class="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/20 p-4 sm:p-5"
    >
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-brand-700 dark:text-brand-300">Save this to your account</h3>
          <p class="mt-0.5 text-sm text-brand-600 dark:text-brand-400">
            Sign in with Google to track all your applications in one place — even across different companies.
          </p>
        </div>
        <NuxtLink
          :to="`/api/portal/auth/google?returnTo=/portal/t/${token}`"
          class="shrink-0 inline-flex items-center gap-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-200 shadow-sm hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
          external
        >
          <svg class="size-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Sign in with Google
        </NuxtLink>
      </div>
    </div>

    <!-- Pipeline Progress -->
    <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 sm:p-6">
      <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">Application Progress</h2>
      <PortalPipelineProgress :stages="data.pipeline" :is-rejected="data.application.isRejected" />
    </div>

    <!-- Two column layout for interviews + documents -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Upcoming Interviews -->
      <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
          <Calendar class="size-4 text-brand-500" />
          Upcoming Interviews
        </h2>

        <div v-if="data.upcomingInterviews.length > 0" class="space-y-3">
          <PortalInterviewCard
            v-for="iv in data.upcomingInterviews"
            :key="iv.id"
            :interview="iv"
          />
        </div>

        <div v-else class="text-center py-8">
          <Calendar class="size-8 mx-auto text-surface-300 dark:text-surface-600 mb-2" />
          <p class="text-sm text-surface-400 dark:text-surface-500">No upcoming interviews</p>
          <p class="text-xs text-surface-300 dark:text-surface-600 mt-1">Interviews will appear here when scheduled</p>
        </div>

        <!-- Past interviews -->
        <div v-if="data.pastInterviews.length > 0" class="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800">
          <h3 class="text-xs font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-3">Past Interviews</h3>
          <div class="space-y-2">
            <PortalInterviewCard
              v-for="iv in data.pastInterviews"
              :key="iv.id"
              :interview="iv"
            />
          </div>
        </div>
      </div>

      <!-- Documents -->
      <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
          <FileText class="size-4 text-brand-500" />
          Your Documents
        </h2>

        <div v-if="data.documents.length > 0" class="space-y-2">
          <div
            v-for="doc in data.documents"
            :key="doc.id"
            class="flex items-center gap-3 rounded-lg border border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 px-3 py-2.5"
          >
            <div class="size-8 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
              <FileText class="size-4 text-brand-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-surface-700 dark:text-surface-200 truncate">
                {{ doc.filename }}
              </p>
              <p class="text-xs text-surface-400 dark:text-surface-500">
                {{ doc.type === 'resume' ? 'Resume' : doc.type === 'cover_letter' ? 'Cover Letter' : 'Document' }}
                &middot; Uploaded {{ formatDate(doc.uploadedAt) }}
              </p>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <FileText class="size-8 mx-auto text-surface-300 dark:text-surface-600 mb-2" />
          <p class="text-sm text-surface-400 dark:text-surface-500">No documents uploaded</p>
        </div>
      </div>
    </div>

    <!-- Timeline -->
    <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 sm:p-6">
      <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
        <Clock class="size-4 text-brand-500" />
        Activity Timeline
      </h2>

      <div v-if="data.timeline.length > 0">
        <PortalStatusTimeline :entries="data.timeline" />
      </div>

      <div v-else class="text-center py-8">
        <Clock class="size-8 mx-auto text-surface-300 dark:text-surface-600 mb-2" />
        <p class="text-sm text-surface-400 dark:text-surface-500">No activity yet</p>
      </div>
    </div>

    <!-- What to expect section -->
    <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-gradient-to-br from-surface-50 to-brand-50/30 dark:from-surface-900 dark:to-brand-950/20 p-5 sm:p-6">
      <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-3">What happens next?</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="flex items-start gap-3">
          <div class="size-8 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0 text-brand-600 dark:text-brand-400 text-sm font-bold">1</div>
          <div>
            <p class="text-sm font-medium text-surface-700 dark:text-surface-200">Review</p>
            <p class="text-xs text-surface-500 dark:text-surface-400">The hiring team reviews your application</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="size-8 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0 text-brand-600 dark:text-brand-400 text-sm font-bold">2</div>
          <div>
            <p class="text-sm font-medium text-surface-700 dark:text-surface-200">Interview</p>
            <p class="text-xs text-surface-500 dark:text-surface-400">If selected, you'll be invited to interview</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="size-8 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0 text-brand-600 dark:text-brand-400 text-sm font-bold">3</div>
          <div>
            <p class="text-sm font-medium text-surface-700 dark:text-surface-200">Decision</p>
            <p class="text-xs text-surface-500 dark:text-surface-400">You'll receive a final decision via this portal</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Security info -->
    <p class="text-center text-xs text-surface-400 dark:text-surface-500">
      <Shield class="size-3 inline -mt-0.5" />
      This link is private to you. Bookmark it to check back anytime.
    </p>
  </div>
</template>
