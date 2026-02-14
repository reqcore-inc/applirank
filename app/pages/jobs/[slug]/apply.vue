<script setup lang="ts">
import { MapPin, Briefcase } from 'lucide-vue-next'

definePageMeta({
  layout: 'public',
})

const route = useRoute()
const jobSlug = route.params.slug as string

// Fetch public job data (no auth needed)
const { data: job, status: fetchStatus, error: fetchError } = useFetch(
  `/api/public/jobs/${jobSlug}`,
  { key: `public-job-${jobSlug}` },
)

useSeoMeta({
  title: computed(() => job.value ? `Apply — ${job.value.title}` : 'Apply — Applirank'),
  description: computed(() => job.value?.description?.slice(0, 160) ?? 'Submit your application'),
})

// ─────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  website: '', // honeypot
})

// Dynamic question responses: questionId → value
const responses = ref<Record<string, string | string[] | number | boolean>>({})

const isSubmitting = ref(false)
const errors = ref<Record<string, string>>({})
const submitError = ref<string | null>(null)

function validate(): boolean {
  errors.value = {}

  if (!form.value.firstName.trim()) errors.value.firstName = 'First name is required'
  if (!form.value.lastName.trim()) errors.value.lastName = 'Last name is required'
  if (!form.value.email.trim()) {
    errors.value.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Invalid email address'
  }

  // Validate required custom questions
  if (job.value?.questions) {
    for (const q of job.value.questions) {
      if (q.required) {
        const val = responses.value[q.id]
        const isEmpty = val === undefined || val === null || val === '' ||
          (Array.isArray(val) && val.length === 0)

        if (isEmpty) {
          errors.value[`q-${q.id}`] = 'This field is required'
        }
      }
    }
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  submitError.value = null
  if (!validate()) return

  isSubmitting.value = true
  try {
    // Build responses array from the map
    const responseArray = Object.entries(responses.value)
      .filter(([_, value]) => {
        if (value === undefined || value === null || value === '') return false
        if (Array.isArray(value) && value.length === 0) return false
        return true
      })
      .map(([questionId, value]) => ({ questionId, value }))

    await $fetch(`/api/public/jobs/${jobSlug}/apply`, {
      method: 'POST',
      body: {
        firstName: form.value.firstName.trim(),
        lastName: form.value.lastName.trim(),
        email: form.value.email.trim(),
        phone: form.value.phone.trim() || undefined,
        website: form.value.website, // honeypot
        responses: responseArray,
      },
    })

    await navigateTo(`/jobs/${jobSlug}/confirmation`)
  } catch (err: any) {
    submitError.value = err.data?.statusMessage ?? 'Something went wrong. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

// ─────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────

const typeLabels: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-12 text-surface-400">
      Loading…
    </div>

    <!-- Not found / not open -->
    <div v-else-if="fetchError" class="text-center py-12">
      <h1 class="text-xl font-bold text-surface-900 mb-2">Job Not Found</h1>
      <p class="text-sm text-surface-500 mb-4">
        This position may no longer be accepting applications.
      </p>
      <NuxtLink
        to="/"
        class="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        Back to Home
      </NuxtLink>
    </div>

    <!-- Application form -->
    <template v-else-if="job">
      <!-- Back to job detail -->
      <NuxtLink
        :to="`/jobs/${jobSlug}`"
        class="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors mb-6"
      >
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to job details
      </NuxtLink>

      <!-- Job header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-surface-900 mb-2">{{ job.title }}</h1>
        <div class="flex items-center gap-4 text-sm text-surface-500">
          <span class="inline-flex items-center gap-1">
            <Briefcase class="size-3.5" />
            {{ typeLabels[job.type] ?? job.type }}
          </span>
          <span v-if="job.location" class="inline-flex items-center gap-1">
            <MapPin class="size-3.5" />
            {{ job.location }}
          </span>
        </div>
        <p v-if="job.description" class="mt-4 text-sm text-surface-600 whitespace-pre-wrap">
          {{ job.description }}
        </p>
      </div>

      <hr class="border-surface-200 mb-8" />

      <h2 class="text-lg font-semibold text-surface-900 mb-6">Apply for this position</h2>

      <!-- Server error -->
      <div
        v-if="submitError"
        class="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 mb-4"
      >
        {{ submitError }}
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <!-- Honeypot (hidden from humans) -->
        <div class="absolute -left-[9999px]" aria-hidden="true">
          <label for="website">Website</label>
          <input id="website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
        </div>

        <!-- Standard fields -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- First Name -->
          <div>
            <label for="firstName" class="block text-sm font-medium text-surface-700 mb-1">
              First Name <span class="text-danger-500">*</span>
            </label>
            <input
              id="firstName"
              v-model="form.firstName"
              type="text"
              class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              :class="errors.firstName ? 'border-danger-300' : 'border-surface-300'"
            />
            <p v-if="errors.firstName" class="mt-1 text-xs text-danger-600">{{ errors.firstName }}</p>
          </div>

          <!-- Last Name -->
          <div>
            <label for="lastName" class="block text-sm font-medium text-surface-700 mb-1">
              Last Name <span class="text-danger-500">*</span>
            </label>
            <input
              id="lastName"
              v-model="form.lastName"
              type="text"
              class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              :class="errors.lastName ? 'border-danger-300' : 'border-surface-300'"
            />
            <p v-if="errors.lastName" class="mt-1 text-xs text-danger-600">{{ errors.lastName }}</p>
          </div>
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-surface-700 mb-1">
            Email <span class="text-danger-500">*</span>
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="you@example.com"
            class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            :class="errors.email ? 'border-danger-300' : 'border-surface-300'"
          />
          <p v-if="errors.email" class="mt-1 text-xs text-danger-600">{{ errors.email }}</p>
        </div>

        <!-- Phone -->
        <div>
          <label for="phone" class="block text-sm font-medium text-surface-700 mb-1">
            Phone
          </label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
          />
        </div>

        <!-- Custom questions -->
        <template v-if="job.questions && job.questions.length > 0">
          <hr class="border-surface-200" />

          <DynamicField
            v-for="q in job.questions"
            :key="q.id"
            v-model="responses[q.id]"
            :question="q"
            :error="errors[`q-${q.id}`]"
          />
        </template>

        <!-- Submit -->
        <div class="pt-2">
          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ isSubmitting ? 'Submitting…' : 'Submit Application' }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
