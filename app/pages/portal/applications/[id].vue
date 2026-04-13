<script setup lang="ts">
import {
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  FileText,
  Clock,
  ChevronLeft,
  Shield,
  Globe,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'portal',
})

const route = useRoute()
const applicationId = computed(() => route.params.id as string)

// Check session
const { data: sessionData } = await useFetch('/api/portal/auth/session')
if (!sessionData.value?.authenticated) {
  await navigateTo('/portal/auth/sign-in')
}

const { data, error, status } = await useFetch(`/api/portal/applications/${applicationId.value}`, {
  key: `portal-app-${applicationId.value}`,
  headers: useRequestHeaders(['cookie']),
})

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

function getRelativeTime(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}
</script>

<template>
  <!-- Back nav -->
  <div class="mb-4">
    <NuxtLink
      to="/portal"
      class="inline-flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
    >
      <ChevronLeft class="size-4" />
      Back to all applications
    </NuxtLink>
  </div>

  <!-- Error state -->
  <div v-if="error" class="flex flex-col items-center justify-center py-20 text-center">
    <div class="size-16 rounded-full bg-danger-50 dark:bg-danger-900/30 flex items-center justify-center mb-4">
      <Shield class="size-8 text-danger-500" />
    </div>
    <h1 class="text-xl font-bold text-surface-900 dark:text-surface-100">Application Not Found</h1>
    <p class="mt-2 text-sm text-surface-500 dark:text-surface-400">
      This application could not be loaded.
    </p>
    <NuxtLink
      to="/portal"
      class="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 transition-colors"
    >
      Back to dashboard
    </NuxtLink>
  </div>

  <!-- Loading state -->
  <div v-else-if="status === 'pending'" class="flex items-center justify-center py-20">
    <div class="animate-spin size-8 border-2 border-brand-500 border-t-transparent rounded-full" />
  </div>

  <!-- Dashboard content (same layout as token page) -->
  <div v-else-if="data" class="space-y-6">
    <!-- Header card -->
    <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden">
      <div class="h-1.5 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-600" />
      <div class="p-5 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex items-start gap-4">
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
          <PortalStatusBadge :status="data.application.status" />
        </div>
        <div class="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between text-sm text-surface-500 dark:text-surface-400">
          <span class="flex items-center gap-1.5">
            <Calendar class="size-3.5" />
            Applied {{ formatDate(data.application.appliedAt) }}
          </span>
          <span v-if="data.application.lastUpdated" class="flex items-center gap-1.5">
            <Clock class="size-3.5" />
            Updated {{ getRelativeTime(data.application.lastUpdated) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Pipeline Progress -->
    <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 sm:p-6">
      <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">Application Progress</h2>
      <PortalPipelineProgress :stages="data.pipeline" :is-rejected="data.application.isRejected" />
    </div>

    <!-- Interviews + Documents side by side -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
          <Calendar class="size-4 text-brand-500" />
          Upcoming Interviews
        </h2>
        <div v-if="data.upcomingInterviews.length > 0" class="space-y-3">
          <PortalInterviewCard v-for="iv in data.upcomingInterviews" :key="iv.id" :interview="iv" />
        </div>
        <div v-else class="text-center py-8">
          <Calendar class="size-8 mx-auto text-surface-300 dark:text-surface-600 mb-2" />
          <p class="text-sm text-surface-400 dark:text-surface-500">No upcoming interviews</p>
        </div>
        <div v-if="data.pastInterviews.length > 0" class="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800">
          <h3 class="text-xs font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-3">Past Interviews</h3>
          <div class="space-y-2">
            <PortalInterviewCard v-for="iv in data.pastInterviews" :key="iv.id" :interview="iv" />
          </div>
        </div>
      </div>

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
              <p class="text-sm font-medium text-surface-700 dark:text-surface-200 truncate">{{ doc.filename }}</p>
              <p class="text-xs text-surface-400 dark:text-surface-500">
                {{ doc.type === 'resume' ? 'Resume' : doc.type === 'cover_letter' ? 'Cover Letter' : 'Document' }}
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
  </div>
</template>
