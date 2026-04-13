<script setup lang="ts">
const config = useRuntimeConfig()
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <!-- Premium portal header -->
    <header class="sticky top-0 z-30 border-b border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="size-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
              <svg class="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span class="text-sm font-semibold text-surface-900 dark:text-surface-100">Application Portal</span>
              <span class="hidden sm:inline text-xs text-surface-400 dark:text-surface-500 ml-2">Powered by Reqcore</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <LanguageSwitcher />
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-surface-200 dark:border-surface-800 mt-16">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 py-6 flex items-center justify-between">
        <p class="text-xs text-surface-400">
          &copy; {{ new Date().getFullYear() }} Applicant Portal
        </p>
        <p class="text-xs text-surface-400">
          Powered by <a :href="config.public.marketingUrl ?? 'https://reqcore.com'" class="underline hover:text-surface-600 dark:hover:text-surface-300" target="_blank" rel="noopener">Reqcore</a>
        </p>
      </div>
    </footer>
  </div>
</template>
