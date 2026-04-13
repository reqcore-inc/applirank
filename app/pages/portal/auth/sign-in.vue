<script setup lang="ts">
import { LogIn, Shield, FileSearch } from 'lucide-vue-next'

definePageMeta({
  layout: 'portal',
})

const route = useRoute()
const error = computed(() => route.query.error as string | undefined)

// Check if already authenticated
const { data: sessionData } = await useFetch('/api/portal/auth/session')
if (sessionData.value?.authenticated) {
  await navigateTo('/portal')
}

useHead({
  title: 'Sign In — Application Portal',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh]">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="size-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/20">
          <FileSearch class="size-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100">Application Portal</h1>
        <p class="mt-2 text-sm text-surface-500 dark:text-surface-400">
          Sign in to track all your job applications in one place
        </p>
      </div>

      <!-- Error message -->
      <div
        v-if="error"
        class="mb-4 rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950/30 px-4 py-3 text-sm text-danger-700 dark:text-danger-300"
      >
        <template v-if="error === 'oauth_denied'">
          You cancelled the sign-in process. Please try again.
        </template>
        <template v-else>
          Something went wrong. Please try again.
        </template>
      </div>

      <!-- Sign in card -->
      <div class="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-6 sm:p-8">
        <NuxtLink
          to="/api/portal/auth/google"
          class="flex w-full items-center justify-center gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-3 text-sm font-medium text-surface-700 dark:text-surface-200 shadow-sm hover:bg-surface-50 dark:hover:bg-surface-700 hover:shadow-md transition-all"
          external
        >
          <svg class="size-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </NuxtLink>

        <div class="mt-6 flex items-center gap-3">
          <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
          <span class="text-xs text-surface-400 dark:text-surface-500">or</span>
          <div class="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
        </div>

        <div class="mt-6 text-center">
          <p class="text-sm text-surface-500 dark:text-surface-400">
            Have an access link? Paste it in your browser to view your application directly.
          </p>
        </div>
      </div>

      <!-- Features -->
      <div class="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="flex items-start gap-3 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-800 p-4">
          <Shield class="size-5 text-brand-500 shrink-0 mt-0.5" />
          <div>
            <p class="text-sm font-medium text-surface-700 dark:text-surface-200">Read-only access</p>
            <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Your data is safe — view only, no changes</p>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-800 p-4">
          <FileSearch class="size-5 text-brand-500 shrink-0 mt-0.5" />
          <div>
            <p class="text-sm font-medium text-surface-700 dark:text-surface-200">All applications</p>
            <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Track every job you've applied to</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
