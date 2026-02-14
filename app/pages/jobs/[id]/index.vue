<script setup lang="ts">
import { MapPin, Briefcase, ArrowLeft, ExternalLink, Calendar } from 'lucide-vue-next'

definePageMeta({
  layout: 'public',
})

const route = useRoute()
const jobId = route.params.id as string

const { data: job, status: fetchStatus, error: fetchError } = useFetch(
  `/api/public/jobs/${jobId}`,
  { key: `public-job-detail-${jobId}` },
)

useSeoMeta({
  title: computed(() => job.value ? `${job.value.title} — Applirank` : 'Job Details — Applirank'),
  description: computed(() => job.value?.description?.slice(0, 160) ?? 'View job details and apply'),
  ogTitle: computed(() => job.value?.title ?? 'Job Details'),
  ogDescription: computed(() => job.value?.description?.slice(0, 160) ?? 'View job details and apply'),
})

const typeLabels: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-16 text-surface-400">
      Loading…
    </div>

    <!-- Not found / not open -->
    <div v-else-if="fetchError" class="text-center py-16">
      <h1 class="text-xl font-bold text-surface-900 mb-2">Job Not Found</h1>
      <p class="text-sm text-surface-500 mb-6">
        This position may no longer be available or is not currently accepting applications.
      </p>
      <NuxtLink
        to="/jobs"
        class="inline-flex items-center gap-1.5 rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors"
      >
        <ArrowLeft class="size-4" />
        Browse all positions
      </NuxtLink>
    </div>

    <!-- Job detail -->
    <template v-else-if="job">
      <!-- Back link -->
      <NuxtLink
        to="/jobs"
        class="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors mb-6"
      >
        <ArrowLeft class="size-3.5" />
        All positions
      </NuxtLink>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-surface-900 mb-3">{{ job.title }}</h1>

        <div class="flex flex-wrap items-center gap-4 text-sm text-surface-500">
          <span class="inline-flex items-center gap-1.5">
            <Briefcase class="size-4" />
            {{ typeLabels[job.type] ?? job.type }}
          </span>
          <span v-if="job.location" class="inline-flex items-center gap-1.5">
            <MapPin class="size-4" />
            {{ job.location }}
          </span>
          <span class="inline-flex items-center gap-1.5">
            <Calendar class="size-4" />
            Posted {{ formatDate(job.createdAt) }}
          </span>
        </div>
      </div>

      <!-- Apply CTA (top) -->
      <div class="rounded-lg border border-brand-200 bg-brand-50 p-4 mb-8 flex items-center justify-between gap-4">
        <p class="text-sm text-brand-800">
          Interested in this role? Apply now and we'll review your application.
        </p>
        <NuxtLink
          :to="`/jobs/${job.id}/apply`"
          class="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Apply Now
          <ExternalLink class="size-3.5" />
        </NuxtLink>
      </div>

      <!-- Description -->
      <div v-if="job.description" class="mb-8">
        <h2 class="text-lg font-semibold text-surface-900 mb-3">About this role</h2>
        <div class="text-sm text-surface-700 leading-relaxed whitespace-pre-wrap">
          {{ job.description }}
        </div>
      </div>

      <!-- Custom questions preview -->
      <div v-if="job.questions && job.questions.length > 0" class="mb-8">
        <h2 class="text-lg font-semibold text-surface-900 mb-3">Application Questions</h2>
        <p class="text-sm text-surface-500 mb-3">
          You'll be asked to answer {{ job.questions.length }} additional
          question{{ job.questions.length === 1 ? '' : 's' }} when you apply.
        </p>
        <ul class="space-y-1.5">
          <li
            v-for="q in job.questions"
            :key="q.id"
            class="flex items-start gap-2 text-sm text-surface-600"
          >
            <span class="text-surface-400 mt-0.5">•</span>
            <span>
              {{ q.label }}
              <span v-if="q.required" class="text-danger-500 text-xs">(required)</span>
            </span>
          </li>
        </ul>
      </div>

      <hr class="border-surface-200 mb-8" />

      <!-- Bottom Apply CTA -->
      <div class="text-center">
        <NuxtLink
          :to="`/jobs/${job.id}/apply`"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Apply for this position
          <ExternalLink class="size-3.5" />
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
