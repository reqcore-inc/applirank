<script setup lang="ts">
import { MapPin, Briefcase, ArrowLeft, ExternalLink, Calendar } from 'lucide-vue-next'

definePageMeta({
  layout: 'public',
})

const route = useRoute()
const jobSlug = route.params.slug as string

const { data: job, status: fetchStatus, error: fetchError } = useFetch(
  `/api/public/jobs/${jobSlug}`,
  { key: `public-job-detail-${jobSlug}` },
)

// ─────────────────────────────────────────────
// SEO — Meta tags (title, description, OG, Twitter)
// ─────────────────────────────────────────────

useSeoMeta({
  title: computed(() => job.value ? `${job.value.title} — Hiring Now` : 'Job Details — Applirank'),
  description: computed(() => {
    if (!job.value) return 'View job details and apply'
    const loc = job.value.location ? ` in ${job.value.location}` : ''
    const org = job.value.organizationName ? ` at ${job.value.organizationName}` : ''
    return `Apply for ${job.value.title}${org}${loc}. ${job.value.description?.slice(0, 120) ?? ''}`.trim()
  }),
  ogTitle: computed(() => job.value ? `${job.value.title} — Hiring Now` : 'Job Details'),
  ogDescription: computed(() => {
    if (!job.value) return 'View job details and apply'
    const org = job.value.organizationName ? ` at ${job.value.organizationName}` : ''
    return `Apply for ${job.value.title}${org}. ${job.value.location ?? 'Remote'}.`
  }),
  ogType: 'website',
  ogImage: '/og-image.png',
  twitterCard: 'summary_large_image',
  twitterTitle: computed(() => job.value?.title ?? 'Job Details'),
  twitterDescription: computed(() => {
    if (!job.value) return 'View job details and apply'
    return `Apply for ${job.value.title}. ${job.value.location ?? 'Remote'}.`
  }),
})

// ─────────────────────────────────────────────
// SEO — JSON-LD JobPosting structured data (Google Jobs)
// ─────────────────────────────────────────────

/** Map internal job type to schema.org employmentType */
function mapEmploymentType(type: string): string {
  const map: Record<string, string> = {
    full_time: 'FULL_TIME',
    part_time: 'PART_TIME',
    contract: 'CONTRACTOR',
    internship: 'INTERN',
  }
  return map[type] || 'OTHER'
}

// Build the JobPosting JSON-LD reactively
watchEffect(() => {
  if (!job.value) return

  const j = job.value
  const posting: Record<string, unknown> = {
    '@type': 'JobPosting',
    'title': j.title,
    'description': j.description ?? j.title,
    'datePosted': j.createdAt,
    'employmentType': mapEmploymentType(j.type),
    'directApply': true,
  }

  // Hiring organization
  if (j.organizationName) {
    posting.hiringOrganization = {
      '@type': 'Organization',
      'name': j.organizationName,
      ...(j.organizationLogo ? { logo: j.organizationLogo } : {}),
    }
  }

  // Job location
  if (j.location) {
    posting.jobLocation = {
      '@type': 'Place',
      'address': {
        '@type': 'PostalAddress',
        'addressLocality': j.location,
      },
    }
  }

  // Remote work
  if (j.remoteStatus === 'remote') {
    posting.jobLocationType = 'TELECOMMUTE'
    posting.applicantLocationRequirements = {
      '@type': 'Country',
      'name': 'Anywhere',
    }
  }

  // Valid through
  if (j.validThrough) {
    posting.validThrough = new Date(j.validThrough).toISOString()
  }

  // Salary (baseSalary)
  if (j.salaryMin || j.salaryMax) {
    const value: Record<string, unknown> = { '@type': 'QuantitativeValue' }
    if (j.salaryMin && j.salaryMax) {
      value.minValue = j.salaryMin
      value.maxValue = j.salaryMax
    } else if (j.salaryMin) {
      value.value = j.salaryMin
    } else if (j.salaryMax) {
      value.value = j.salaryMax
    }
    if (j.salaryUnit) {
      value.unitText = j.salaryUnit
    }
    posting.baseSalary = {
      '@type': 'MonetaryAmount',
      'currency': j.salaryCurrency || 'USD',
      'value': value,
    }
  }

  useSchemaOrg([posting])
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

/** Format salary for display */
function formatSalary(min?: number | null, max?: number | null, currency?: string | null, unit?: string | null): string | null {
  if (!min && !max) return null
  const cur = currency || 'USD'
  const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v)
  const unitLabel = unit ? `/${unit.toLowerCase().replace('year', 'yr').replace('month', 'mo').replace('hour', 'hr')}` : ''
  if (min && max) return `${fmt(min)} – ${fmt(max)}${unitLabel}`
  return `${fmt(min || max!)}${unitLabel}`
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
      <h1 class="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">Job Not Found</h1>
      <p class="text-sm text-surface-500 mb-6">
        This position may no longer be available or is not currently accepting applications.
      </p>
      <NuxtLink
        to="/jobs"
        class="inline-flex items-center gap-1.5 rounded-lg border border-surface-300 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
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
        class="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors mb-6"
      >
        <ArrowLeft class="size-3.5" />
        All positions
      </NuxtLink>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-3">{{ job.title }}</h1>

        <div class="flex flex-wrap items-center gap-4 text-sm text-surface-500">
          <span class="inline-flex items-center gap-1.5">
            <Briefcase class="size-4" />
            {{ typeLabels[job.type] ?? job.type }}
          </span>
          <span v-if="job.location" class="inline-flex items-center gap-1.5">
            <MapPin class="size-4" />
            {{ job.location }}
          </span>
          <span v-if="formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryUnit)" class="inline-flex items-center gap-1.5 font-medium text-success-600 dark:text-success-400">
            {{ formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryUnit) }}
          </span>
          <span class="inline-flex items-center gap-1.5">
            <Calendar class="size-4" />
            Posted {{ formatDate(job.createdAt) }}
          </span>
        </div>
      </div>

      <!-- Apply CTA (top) -->
      <div class="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950 p-4 mb-8 flex items-center justify-between gap-4">
        <p class="text-sm text-brand-800 dark:text-brand-200">
          Interested in this role? Apply now and we'll review your application.
        </p>
        <NuxtLink
          :to="`/jobs/${job.slug}/apply`"
          class="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Apply Now
          <ExternalLink class="size-3.5" />
        </NuxtLink>
      </div>

      <!-- Description -->
      <div v-if="job.description" class="mb-8">
        <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-3">About this role</h2>
        <div class="text-sm text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">
          {{ job.description }}
        </div>
      </div>

      <!-- Custom questions preview -->
      <div v-if="job.questions && job.questions.length > 0" class="mb-8">
        <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-3">Application Questions</h2>
        <p class="text-sm text-surface-500 mb-3">
          You'll be asked to answer {{ job.questions.length }} additional
          question{{ job.questions.length === 1 ? '' : 's' }} when you apply.
        </p>
        <ul class="space-y-1.5">
          <li
            v-for="q in job.questions"
            :key="q.id"
            class="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-400"
          >
            <span class="text-surface-400 mt-0.5">•</span>
            <span>
              {{ q.label }}
              <span v-if="q.required" class="text-danger-500 text-xs">(required)</span>
            </span>
          </li>
        </ul>
      </div>

      <hr class="border-surface-200 dark:border-surface-800 mb-8" />

      <!-- Bottom Apply CTA -->
      <div class="text-center">
        <NuxtLink
          :to="`/jobs/${job.slug}/apply`"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Apply for this position
          <ExternalLink class="size-3.5" />
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
