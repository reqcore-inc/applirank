<script setup lang="ts">
import { CheckCircle, ExternalLink, Clipboard, Check } from 'lucide-vue-next'

definePageMeta({
  layout: 'public',
})

const route = useRoute()
const jobSlug = route.params.slug as string
const portalToken = computed(() => route.query.pt as string | undefined)
const { track } = useTrack()

onMounted(() => track('application_confirmed', { slug: jobSlug }))

// Optionally fetch job title for a nicer confirmation
const { data: job } = useFetch(`/api/public/jobs/${jobSlug}`, {
  key: `public-job-confirm-${jobSlug}`,
})

useSeoMeta({
  title: 'Application Submitted — Reqcore',
  robots: 'noindex, nofollow',
})

// Build portal URL
const config = useRuntimeConfig()
const portalUrl = computed(() => {
  if (!portalToken.value) return null
  // Use current origin for the portal link
  if (import.meta.client) {
    return `${window.location.origin}/portal/t/${portalToken.value}`
  }
  return `/portal/t/${portalToken.value}`
})

const copied = ref(false)
async function copyLink() {
  if (!portalUrl.value) return
  try {
    await navigator.clipboard.writeText(portalUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Fallback: select text
  }
}
</script>

<template>
  <div class="text-center py-12">
    <div class="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-900">
      <CheckCircle class="size-8 text-success-600" />
    </div>

    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">
      Application Submitted!
    </h1>

    <p class="text-surface-600 dark:text-surface-400 max-w-md mx-auto mb-2">
      Thank you for applying
      <template v-if="job">
        for the <strong>{{ job.title }}</strong> position
      </template>.
    </p>

    <p class="text-sm text-surface-400 max-w-md mx-auto mb-8">
      Your application has been received. The hiring team will review it and get back to you if there&rsquo;s a match.
    </p>

    <!-- Portal link card -->
    <div
      v-if="portalUrl"
      class="mx-auto max-w-lg mb-8 rounded-2xl border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/20 p-5 text-left"
    >
      <h3 class="text-sm font-semibold text-brand-700 dark:text-brand-300 mb-1">Track Your Application</h3>
      <p class="text-sm text-brand-600 dark:text-brand-400 mb-3">
        Bookmark this link to check your application status anytime. You can also sign in with Google to track all applications.
      </p>
      <div class="flex items-center gap-2">
        <div class="flex-1 rounded-lg border border-brand-200 dark:border-brand-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-600 dark:text-surface-300 truncate font-mono">
          {{ portalUrl }}
        </div>
        <button
          class="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          @click="copyLink"
        >
          <component :is="copied ? Check : Clipboard" class="size-4" />
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
      <div class="mt-3 flex items-center gap-3">
        <NuxtLink
          :to="portalUrl"
          class="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
        >
          <ExternalLink class="size-3.5" />
          View your dashboard now
        </NuxtLink>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
      <NuxtLink
        :to="$localePath('/jobs')"
        class="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        Browse more positions
      </NuxtLink>
      <a
        :href="useRuntimeConfig().public.marketingUrl"
        class="inline-flex items-center rounded-lg border border-surface-300 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
      >
        Back to Home
      </a>
    </div>
  </div>
</template>
