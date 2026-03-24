<script setup lang="ts">
import { Radio } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Source Tracking — Reqcore',
  description: 'Track where your impressions and applications come from',
})

const { track } = useTrack()

onMounted(() => track('source_tracking_viewed'))
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="flex flex-col items-center justify-center py-24 text-center">
      <div class="mx-auto mb-6 flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-lg shadow-brand-500/20">
        <Radio class="size-7 text-white" />
      </div>
      <div class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-200 dark:ring-amber-800 mb-5">
        Coming Soon
      </div>
      <h1 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-surface-50 tracking-tight mb-4">
        Source Tracking
      </h1>
      <p class="text-sm sm:text-base text-surface-500 dark:text-surface-400 max-w-md mx-auto leading-relaxed">
        See where your impressions and applications come from — job boards, social media, referrals, and more. We're working on it.
      </p>
    </div>
  </div>
</template>
