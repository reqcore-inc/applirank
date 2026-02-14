<script setup lang="ts">
import { CheckCircle } from 'lucide-vue-next'

definePageMeta({
  layout: 'public',
})

const route = useRoute()
const jobSlug = route.params.slug as string

// Optionally fetch job title for a nicer confirmation
const { data: job } = useFetch(`/api/public/jobs/${jobSlug}`, {
  key: `public-job-confirm-${jobSlug}`,
})

useSeoMeta({
  title: 'Application Submitted — Applirank',
})
</script>

<template>
  <div class="text-center py-12">
    <div class="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-success-100">
      <CheckCircle class="size-8 text-success-600" />
    </div>

    <h1 class="text-2xl font-bold text-surface-900 mb-2">
      Application Submitted!
    </h1>

    <p class="text-surface-600 max-w-md mx-auto mb-2">
      Thank you for applying
      <template v-if="job">
        for the <strong>{{ job.title }}</strong> position
      </template>.
    </p>

    <p class="text-sm text-surface-400 max-w-md mx-auto mb-8">
      Your application has been received. The hiring team will review it and get back to you if there&rsquo;s a match.
    </p>

    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
      <NuxtLink
        to="/jobs"
        class="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        Browse more positions
      </NuxtLink>
      <NuxtLink
        to="/"
        class="inline-flex items-center rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors"
      >
        Back to Home
      </NuxtLink>
    </div>
  </div>
</template>
