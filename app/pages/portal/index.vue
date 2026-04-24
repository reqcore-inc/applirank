<script setup lang="ts">
import {
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  ChevronRight,
  LogOut,
  User,
  Inbox,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'portal',
})

const { data: sessionData, error: sessionError } = await useFetch('/api/portal/auth/session')

// Redirect to sign-in if not authenticated
if (!sessionData.value?.authenticated) {
  await navigateTo('/portal/auth/sign-in')
}

const { data, error, status, refresh } = await useFetch('/api/portal/dashboard', {
  key: 'portal-dashboard',
  headers: useRequestHeaders(['cookie']),
})

const signingOut = ref(false)

async function signOut() {
  signingOut.value = true
  try {
    await $fetch('/api/portal/auth/sign-out', { method: 'POST' })
    await navigateTo('/portal/auth/sign-in')
  } finally {
    signingOut.value = false
  }
}

// SEO
useHead({
  title: 'My Applications — Application Portal',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
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
  <div>
    <!-- Auth header -->
    <div v-if="data?.account" class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="size-10 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
          <img
            v-if="data.account.image"
            :src="data.account.image"
            :alt="data.account.name ?? 'Profile'"
            class="size-full object-cover"
          />
          <div v-else class="size-full flex items-center justify-center">
            <User class="size-5 text-surface-400" />
          </div>
        </div>
        <div>
          <p class="text-sm font-semibold text-surface-900 dark:text-surface-100">
            {{ data.account.name ?? 'Applicant' }}
          </p>
          <p class="text-xs text-surface-500 dark:text-surface-400">
            {{ data.account.email }}
          </p>
        </div>
      </div>
      <button
        class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        :disabled="signingOut"
        @click="signOut"
      >
        <LogOut class="size-3.5" />
        Sign out
      </button>
    </div>

    <!-- Page title -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-surface-900 dark:text-surface-100">My Applications</h1>
      <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
        Track all your job applications in one place
      </p>
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex items-center justify-center py-20">
      <div class="animate-spin size-8 border-2 border-brand-500 border-t-transparent rounded-full" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <p class="text-sm text-danger-600 dark:text-danger-400">{{ error.data?.message || 'Failed to load applications' }}</p>
      <button
        class="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        @click="refresh()"
      >
        Try again
      </button>
    </div>

    <!-- Empty state -->
    <div v-else-if="!data?.applications?.length" class="text-center py-20">
      <div class="size-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
        <Inbox class="size-8 text-surface-300 dark:text-surface-600" />
      </div>
      <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100">No applications found</h2>
      <p class="mt-2 text-sm text-surface-500 dark:text-surface-400 max-w-md mx-auto">
        No applications were found for {{ data?.account?.email }}. Make sure you applied using this email address.
      </p>
    </div>

    <!-- Application cards -->
    <div v-else class="space-y-4">
      <NuxtLink
        v-for="app in data.applications"
        :key="app.id"
        :to="`/portal/applications/${app.id}`"
        class="block rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5 transition-all hover:shadow-lg hover:border-brand-200 dark:hover:border-brand-800 hover:-translate-y-0.5 group"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-4 min-w-0">
            <!-- Company logo -->
            <div class="size-11 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                v-if="app.organization.logo"
                :src="app.organization.logo"
                :alt="app.organization.name"
                class="size-full object-cover"
              />
              <Building2 v-else class="size-5 text-surface-400" />
            </div>

            <div class="min-w-0">
              <h3 class="text-base font-semibold text-surface-900 dark:text-surface-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {{ app.job.title }}
              </h3>
              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-surface-500 dark:text-surface-400">
                <span class="flex items-center gap-1">
                  <Building2 class="size-3.5" />
                  {{ app.organization.name }}
                </span>
                <span v-if="app.job.location" class="flex items-center gap-1">
                  <MapPin class="size-3.5" />
                  {{ app.job.location }}
                </span>
                <span class="flex items-center gap-1">
                  <Briefcase class="size-3.5" />
                  {{ app.job.type }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <PortalStatusBadge :status="app.status" />
            <ChevronRight class="size-4 text-surface-300 dark:text-surface-600 group-hover:text-brand-500 transition-colors" />
          </div>
        </div>

        <!-- Mini pipeline + meta -->
        <div class="mt-4 pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
          <!-- Mini pipeline dots -->
          <div class="flex items-center gap-1">
            <div
              v-for="stage in app.pipeline"
              :key="stage.key"
              class="size-2 rounded-full transition-colors"
              :class="[
                stage.status === 'completed' && 'bg-brand-500',
                stage.status === 'current' && 'bg-brand-500 ring-2 ring-brand-200 dark:ring-brand-800',
                stage.status === 'upcoming' && 'bg-surface-200 dark:bg-surface-700',
                stage.status === 'inactive' && 'bg-surface-200 dark:bg-surface-700',
              ]"
            />
          </div>

          <div class="flex items-center gap-3 text-xs text-surface-400 dark:text-surface-500">
            <span v-if="app.upcomingInterviewCount > 0" class="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-medium">
              <Calendar class="size-3" />
              {{ app.upcomingInterviewCount }} upcoming
            </span>
            <span>Applied {{ getRelativeTime(app.appliedAt) }}</span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
