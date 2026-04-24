<script setup lang="ts">
import { Globe, Save, Check, Loader2 } from 'lucide-vue-next'

definePageMeta({})

useSeoMeta({
  title: 'Localization Settings — Reqcore',
  description: 'Configure name display format and date format for your organization',
})

const { allowed: canUpdateOrg } = usePermission({ organization: ['update'] })
const { nameDisplayFormat, dateFormat, updateSettings } = useOrgSettings()
const { track } = useTrack()

const localNameFormat = ref<'first_last' | 'last_first'>('first_last')
const localDateFormat = ref<'mdy' | 'dmy' | 'ymd'>('mdy')

// Sync from loaded settings
watch([nameDisplayFormat, dateFormat], ([nf, df]) => {
  localNameFormat.value = nf as 'first_last' | 'last_first'
  localDateFormat.value = df as 'mdy' | 'dmy' | 'ymd'
}, { immediate: true })

const isSaving = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')

async function handleSave() {
  if (!canUpdateOrg.value) return
  isSaving.value = true
  saveError.value = ''
  saveSuccess.value = false

  try {
    await updateSettings({
      nameDisplayFormat: localNameFormat.value,
      dateFormat: localDateFormat.value,
    })
    track('localization_settings_saved')
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  }
  catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save settings'
  }
  finally {
    isSaving.value = false
  }
}

// Preview helpers
const previewCandidate = { firstName: 'Jane', lastName: 'Doe', displayName: null }
const previewNameFormatted = computed(() => {
  if (localNameFormat.value === 'last_first') return `${previewCandidate.lastName} ${previewCandidate.firstName}`
  return `${previewCandidate.firstName} ${previewCandidate.lastName}`
})

const previewDate = '1990-05-24'
const previewDateFormatted = computed(() => {
  const [year, month, day] = previewDate.split('-')
  switch (localDateFormat.value) {
    case 'dmy': return `${day}/${month}/${year}`
    case 'ymd': return `${year}-${month}-${day}`
    case 'mdy':
    default: return `${month}/${day}/${year}`
  }
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <!-- Page title -->
    <div class="mb-6">
      <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-50">
        Localization
      </h1>
      <p class="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
        Configure how candidate names and dates are displayed across your organization.
      </p>
    </div>

    <!-- Settings card -->
    <section class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
      <div class="px-4 sm:px-6 py-5 border-b border-surface-200 dark:border-surface-800">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center size-10 shrink-0 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
            <Globe class="size-5" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Display preferences</h2>
            <p class="text-sm text-surface-500 dark:text-surface-400">Controls name and date formatting for all members of this organization.</p>
          </div>
        </div>
      </div>

      <div class="px-4 sm:px-6 py-5 space-y-6">
        <!-- Name display format -->
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Name display format
          </label>
          <p class="text-xs text-surface-400 dark:text-surface-500 mb-3">
            Choose how candidate names are displayed throughout the application. You can always override this on individual candidates using the Display Name field.
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <label
              class="flex items-start gap-3 flex-1 rounded-lg border p-3.5 cursor-pointer transition-colors"
              :class="localNameFormat === 'first_last'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 dark:border-brand-600'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
            >
              <input
                v-model="localNameFormat"
                type="radio"
                value="first_last"
                class="mt-0.5 accent-brand-600"
                :disabled="!canUpdateOrg"
              />
              <div>
                <span class="block text-sm font-medium text-surface-800 dark:text-surface-200">First Last</span>
                <span class="block text-xs text-surface-400 mt-0.5">e.g. Jane Doe</span>
              </div>
            </label>
            <label
              class="flex items-start gap-3 flex-1 rounded-lg border p-3.5 cursor-pointer transition-colors"
              :class="localNameFormat === 'last_first'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 dark:border-brand-600'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
            >
              <input
                v-model="localNameFormat"
                type="radio"
                value="last_first"
                class="mt-0.5 accent-brand-600"
                :disabled="!canUpdateOrg"
              />
              <div>
                <span class="block text-sm font-medium text-surface-800 dark:text-surface-200">Last First</span>
                <span class="block text-xs text-surface-400 mt-0.5">e.g. Doe Jane</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Date format -->
        <div>
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Date format
          </label>
          <p class="text-xs text-surface-400 dark:text-surface-500 mb-3">
            Controls how dates (e.g. date of birth) are displayed.
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <label
              class="flex items-start gap-3 flex-1 rounded-lg border p-3.5 cursor-pointer transition-colors"
              :class="localDateFormat === 'mdy'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 dark:border-brand-600'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
            >
              <input
                v-model="localDateFormat"
                type="radio"
                value="mdy"
                class="mt-0.5 accent-brand-600"
                :disabled="!canUpdateOrg"
              />
              <div>
                <span class="block text-sm font-medium text-surface-800 dark:text-surface-200">MM/DD/YYYY</span>
                <span class="block text-xs text-surface-400 mt-0.5">United States</span>
              </div>
            </label>
            <label
              class="flex items-start gap-3 flex-1 rounded-lg border p-3.5 cursor-pointer transition-colors"
              :class="localDateFormat === 'dmy'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 dark:border-brand-600'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
            >
              <input
                v-model="localDateFormat"
                type="radio"
                value="dmy"
                class="mt-0.5 accent-brand-600"
                :disabled="!canUpdateOrg"
              />
              <div>
                <span class="block text-sm font-medium text-surface-800 dark:text-surface-200">DD/MM/YYYY</span>
                <span class="block text-xs text-surface-400 mt-0.5">Europe, Vietnam & most regions</span>
              </div>
            </label>
            <label
              class="flex items-start gap-3 flex-1 rounded-lg border p-3.5 cursor-pointer transition-colors"
              :class="localDateFormat === 'ymd'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 dark:border-brand-600'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'"
            >
              <input
                v-model="localDateFormat"
                type="radio"
                value="ymd"
                class="mt-0.5 accent-brand-600"
                :disabled="!canUpdateOrg"
              />
              <div>
                <span class="block text-sm font-medium text-surface-800 dark:text-surface-200">YYYY-MM-DD</span>
                <span class="block text-xs text-surface-400 mt-0.5">ISO 8601 / East Asia</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Live preview -->
        <div class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-4">
          <p class="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-2">Preview</p>
          <div class="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-surface-400">Name:</span>
              <span class="font-medium text-surface-900 dark:text-surface-100">{{ previewNameFormatted }}</span>
            </div>
            <div class="hidden sm:block text-surface-300 dark:text-surface-600">·</div>
            <div class="flex items-center gap-2">
              <span class="text-surface-400">Date of Birth:</span>
              <span class="font-medium text-surface-900 dark:text-surface-100">{{ previewDateFormatted }}</span>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div
          v-if="saveError"
          class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 px-4 py-3 text-sm text-danger-700 dark:text-danger-400"
        >
          {{ saveError }}
        </div>

        <!-- Save button -->
        <div class="flex items-center gap-3">
          <button
            :disabled="!canUpdateOrg || isSaving"
            class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="handleSave"
          >
            <Check v-if="saveSuccess" class="size-4" />
            <Loader2 v-else-if="isSaving" class="size-4 animate-spin" />
            <Save v-else class="size-4" />
            {{ saveSuccess ? 'Saved!' : isSaving ? 'Saving…' : 'Save changes' }}
          </button>
          <p v-if="!canUpdateOrg" class="text-xs text-surface-400">Only admins and owners can change organization settings.</p>
        </div>
      </div>
    </section>
  </div>
</template>
