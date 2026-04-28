<script setup lang="ts">
import {
  Brain, Sparkles, SlidersHorizontal, Plus, Trash2, Loader2, Save, RotateCcw,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const jobId = route.params.id as string
const toast = useToast()
const { track } = useTrack()

const { job, status: jobFetchStatus, error: jobError, updateJob } = useJob(jobId)

useSeoMeta({
  title: computed(() =>
    job.value ? `AI Analysis — ${job.value.title} — Reqcore` : 'AI Analysis — Reqcore',
  ),
  robots: 'noindex, nofollow',
})

// ─────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────

type ScoringCriterionDraft = {
  key: string
  name: string
  description: string
  category: 'technical' | 'experience' | 'soft_skills' | 'education' | 'culture' | 'custom'
  maxScore: number
  weight: number
}

const categoryLabels: Record<string, string> = {
  technical: 'Technical',
  experience: 'Experience',
  soft_skills: 'Soft Skills',
  education: 'Education',
  culture: 'Culture',
  custom: 'Custom',
}

const categoryColorClasses: Record<string, string> = {
  technical: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800',
  experience: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:ring-purple-800',
  soft_skills: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800',
  education: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800',
  culture: 'bg-pink-50 text-pink-700 ring-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:ring-pink-800',
  custom: 'bg-surface-50 text-surface-700 ring-surface-200 dark:bg-surface-800/50 dark:text-surface-300 dark:ring-surface-700',
}

// ─────────────────────────────────────────────
// Fetch existing criteria
// ─────────────────────────────────────────────

const { data: criteriaData, status: criteriaFetchStatus, refresh: refreshCriteria } = useFetch(
  () => `/api/jobs/${jobId}/criteria`,
  {
    key: `job-criteria-${jobId}`,
    headers: useRequestHeaders(['cookie']),
  },
)

const scoringCriteria = ref<ScoringCriterionDraft[]>([])
const hasUnsavedChanges = ref(false)

// Sync fetched criteria into editable state
watch(criteriaData, (data) => {
  if (data?.criteria) {
    scoringCriteria.value = data.criteria.map((c: any) => ({
      key: c.key,
      name: c.name,
      description: c.description ?? '',
      category: c.category ?? 'custom',
      maxScore: c.maxScore ?? 10,
      weight: c.weight ?? 50,
    }))
    hasUnsavedChanges.value = false
  }
}, { immediate: true })

// Track changes
watch(scoringCriteria, () => {
  hasUnsavedChanges.value = true
}, { deep: true })

// ─────────────────────────────────────────────
// Auto-score toggle
// ─────────────────────────────────────────────

const autoScoreOnApply = ref(false)
const isSavingAutoScore = ref(false)

watch(job, (j) => {
  if (j) autoScoreOnApply.value = (j as any).autoScoreOnApply ?? false
}, { immediate: true })

async function toggleAutoScore() {
  isSavingAutoScore.value = true
  try {
    await $fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      body: { autoScoreOnApply: autoScoreOnApply.value },
    })
    toast.success('Auto-score setting updated')
  } catch (err: any) {
    toast.error('Failed to update setting', { message: err?.data?.statusMessage })
    autoScoreOnApply.value = !autoScoreOnApply.value
  } finally {
    isSavingAutoScore.value = false
  }
}

// ─────────────────────────────────────────────
// Template loading
// ─────────────────────────────────────────────

const selectedTemplate = ref<'standard' | 'technical' | 'non_technical'>('standard')

const templates: Record<string, ScoringCriterionDraft[]> = {
  standard: [
    { key: 'technical_skills', name: 'Technical Skills', description: 'Evaluate the candidate\'s technical competencies against the job requirements.', category: 'technical', maxScore: 10, weight: 50 },
    { key: 'relevant_experience', name: 'Relevant Experience', description: 'Assess years and quality of experience directly relevant to the role.', category: 'experience', maxScore: 10, weight: 50 },
    { key: 'education_fit', name: 'Education & Certifications', description: 'Evaluate educational background and certifications relevant to the position.', category: 'education', maxScore: 10, weight: 30 },
  ],
  technical: [
    { key: 'core_tech_stack', name: 'Core Tech Stack Match', description: 'How well the candidate\'s technical skills match the primary technologies.', category: 'technical', maxScore: 10, weight: 70 },
    { key: 'system_design', name: 'System Design & Architecture', description: 'Evidence of system design experience and architectural decision-making.', category: 'technical', maxScore: 10, weight: 50 },
    { key: 'engineering_practices', name: 'Engineering Practices', description: 'Testing, CI/CD, code review, and software development lifecycle experience.', category: 'technical', maxScore: 10, weight: 40 },
    { key: 'relevant_experience', name: 'Relevant Experience', description: 'Years and depth of experience in similar roles or domains.', category: 'experience', maxScore: 10, weight: 50 },
    { key: 'leadership_collab', name: 'Leadership & Collaboration', description: 'Evidence of mentoring, tech leadership, and cross-team collaboration.', category: 'soft_skills', maxScore: 10, weight: 30 },
  ],
  non_technical: [
    { key: 'relevant_experience', name: 'Relevant Experience', description: 'Depth and breadth of experience applicable to the role.', category: 'experience', maxScore: 10, weight: 60 },
    { key: 'communication', name: 'Communication Skills', description: 'Evidence of written and verbal communication ability.', category: 'soft_skills', maxScore: 10, weight: 50 },
    { key: 'domain_knowledge', name: 'Domain Knowledge', description: 'Relevant industry or domain expertise.', category: 'experience', maxScore: 10, weight: 40 },
    { key: 'education_fit', name: 'Education & Certifications', description: 'Educational background and certifications relevant to the position.', category: 'education', maxScore: 10, weight: 30 },
    { key: 'culture_fit', name: 'Culture & Values Alignment', description: 'Indicators of alignment with company values and team culture.', category: 'culture', maxScore: 10, weight: 30 },
  ],
}

function loadTemplate(template: 'standard' | 'technical' | 'non_technical') {
  scoringCriteria.value = structuredClone(templates[template] ?? [])
}

// ─────────────────────────────────────────────
// AI generation
// ─────────────────────────────────────────────

const isGeneratingCriteria = ref(false)

async function generateAiCriteria() {
  if (!job.value?.description) {
    toast.warning('Job description required', 'Add a job description first so AI can generate relevant criteria.')
    return
  }
  isGeneratingCriteria.value = true
  try {
    const result = await $fetch('/api/ai-config/generate-criteria', {
      method: 'POST',
      body: {
        title: job.value.title,
        description: job.value.description,
      },
    })
    scoringCriteria.value = (result.criteria ?? []).map((c: any) => ({
      key: c.key,
      name: c.name,
      description: c.description ?? '',
      category: c.category ?? 'custom',
      maxScore: c.maxScore ?? 10,
      weight: c.weight ?? 50,
    }))
    track('ai_criteria_generated', { job_id: jobId, criteria_count: scoringCriteria.value.length })
    toast.success('Criteria generated', `${scoringCriteria.value.length} scoring criteria created from job description.`)
  } catch (err: any) {
    const statusCode = err?.data?.statusCode ?? err?.statusCode
    const statusMessage = err?.data?.statusMessage ?? ''
    if (statusCode === 422 && statusMessage.includes('AI provider not configured')) {
      toast.add({
        type: 'warning',
        title: 'AI provider not configured',
        message: 'Set up your AI provider and model before generating criteria.',
        link: { label: 'Go to AI Settings', href: '/dashboard/settings/ai' },
        duration: 10000,
      })
    } else {
      toast.error('Failed to generate criteria', { message: statusMessage })
    }
  } finally {
    isGeneratingCriteria.value = false
  }
}

// ─────────────────────────────────────────────
// Custom criterion form
// ─────────────────────────────────────────────

const showCustomForm = ref(false)
const customCriterionForm = ref({
  key: '',
  name: '',
  description: '',
  category: 'custom' as ScoringCriterionDraft['category'],
  maxScore: 10,
  weight: 50,
})

function autoGenerateKey(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50)
}

function addCustomCriterion() {
  const f = customCriterionForm.value
  if (!f.key || !f.name) return

  const keyExists = scoringCriteria.value.some(c => c.key === f.key)
  if (keyExists) {
    toast.warning('Duplicate criterion', `A criterion with key "${f.key}" already exists.`)
    return
  }

  scoringCriteria.value.push({
    key: f.key,
    name: f.name,
    description: f.description,
    category: f.category,
    maxScore: f.maxScore,
    weight: f.weight,
  })
  customCriterionForm.value = { key: '', name: '', description: '', category: 'custom', maxScore: 10, weight: 50 }
  showCustomForm.value = false
}

function removeCriterion(key: string) {
  scoringCriteria.value = scoringCriteria.value.filter(c => c.key !== key)
}

// ─────────────────────────────────────────────
// Save criteria (POST replaces all)
// ─────────────────────────────────────────────

const isSaving = ref(false)

async function saveCriteria() {
  isSaving.value = true
  try {
    await $fetch(`/api/jobs/${jobId}/criteria`, {
      method: 'POST',
      body: {
        criteria: scoringCriteria.value.map((c, i) => ({
          key: c.key,
          name: c.name,
          description: c.description || undefined,
          category: c.category,
          maxScore: c.maxScore,
          weight: c.weight,
          displayOrder: i,
        })),
      },
    })
    hasUnsavedChanges.value = false
    track('scoring_criteria_saved', { job_id: jobId, criteria_count: scoringCriteria.value.length })
    toast.success('Criteria saved', `${scoringCriteria.value.length} scoring criteria updated.`)
    await refreshCriteria()
  } catch (err: any) {
    toast.error('Failed to save criteria', { message: err?.data?.statusMessage })
  } finally {
    isSaving.value = false
  }
}

function resetCriteria() {
  if (criteriaData.value?.criteria) {
    scoringCriteria.value = criteriaData.value.criteria.map((c: any) => ({
      key: c.key,
      name: c.name,
      description: c.description ?? '',
      category: c.category ?? 'custom',
      maxScore: c.maxScore ?? 10,
      weight: c.weight ?? 50,
    }))
  } else {
    scoringCriteria.value = []
  }
  hasUnsavedChanges.value = false
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <JobSubNavActions :job-id="jobId" />

    <!-- Loading -->
    <div v-if="jobFetchStatus === 'pending' || criteriaFetchStatus === 'pending'" class="text-center py-12 text-surface-400">
      Loading…
    </div>

    <!-- Error -->
    <div
      v-else-if="jobError"
      class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-4 text-sm text-danger-700 dark:text-danger-400"
    >
      {{ jobError.statusCode === 404 ? 'Job not found.' : 'Failed to load job.' }}
      <NuxtLink :to="$localePath('/dashboard')" class="underline ml-1">Back to Jobs</NuxtLink>
    </div>

    <template v-else-if="job">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">AI Analysis</h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Configure how AI evaluates and scores candidates for <strong>{{ job.title }}</strong>.
        </p>
      </div>

      <!-- Empty state: mode selection -->
      <div v-if="scoringCriteria.length === 0" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Pre-made templates -->
          <button
            type="button"
            class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700"
            @click="selectedTemplate = 'standard'"
          >
            <div class="inline-flex items-center justify-center size-10 rounded-lg bg-brand-100 dark:bg-brand-900/50">
              <Brain class="size-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">Pre-made templates</span>
              <span class="text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed">
                Choose from expert-designed scoring rubrics for common role types.
              </span>
            </div>
          </button>

          <!-- AI from job description -->
          <button
            type="button"
            class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700"
            @click="generateAiCriteria()"
          >
            <div class="inline-flex items-center justify-center size-10 rounded-lg bg-purple-100 dark:bg-purple-900/50">
              <Sparkles class="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">Generate from job description</span>
              <span class="text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed">
                AI analyzes your job description and creates tailored criteria.
              </span>
            </div>
            <span v-if="isGeneratingCriteria" class="absolute top-3 right-3">
              <Loader2 class="size-4 text-purple-600 animate-spin" />
            </span>
          </button>

          <!-- Custom criteria -->
          <button
            type="button"
            class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700"
            @click="showCustomForm = true"
          >
            <div class="inline-flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <SlidersHorizontal class="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">Write your own</span>
              <span class="text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed">
                Create custom scoring criteria tailored to your exact needs.
              </span>
            </div>
          </button>
        </div>

        <!-- Pre-made template selector -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            v-for="tmpl in [
              { key: 'standard', label: 'Standard', desc: '3 balanced criteria for any role' },
              { key: 'technical', label: 'Technical', desc: '5 criteria focused on engineering' },
              { key: 'non_technical', label: 'Non-Technical', desc: '5 criteria for business roles' },
            ] as const"
            :key="tmpl.key"
            type="button"
            class="p-4 rounded-lg border text-left transition-all"
            :class="selectedTemplate === tmpl.key
              ? 'border-brand-400 dark:border-brand-600 bg-brand-50 dark:bg-brand-950/30'
              : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50'"
            @click="selectedTemplate = tmpl.key; loadTemplate(tmpl.key)"
          >
            <span class="block text-sm font-medium text-surface-900 dark:text-surface-100">{{ tmpl.label }}</span>
            <span class="text-xs text-surface-500">{{ tmpl.desc }}</span>
          </button>
        </div>

        <!-- No criteria hint -->
        <div class="text-center py-4 text-sm text-surface-400">
          <p>No scoring criteria configured yet. Choose a starting point above, or add criteria manually.</p>
        </div>
      </div>

      <!-- Criteria list -->
      <div v-if="scoringCriteria.length > 0" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-surface-800 dark:text-surface-200">
            {{ scoringCriteria.length }} {{ scoringCriteria.length === 1 ? 'criterion' : 'criteria' }} configured
          </h3>
          <div class="flex items-center gap-2">
            <button
              v-if="hasUnsavedChanges"
              type="button"
              class="inline-flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              @click="resetCriteria"
            >
              <RotateCcw class="size-3" />
              Reset
            </button>
            <button
              type="button"
              class="text-xs text-danger-600 dark:text-danger-400 hover:underline"
              @click="scoringCriteria = []"
            >
              Clear all
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="criterion in scoringCriteria"
            :key="criterion.key"
            class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950 p-4 transition-all hover:shadow-sm"
          >
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ criterion.name }}</span>
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset"
                    :class="categoryColorClasses[criterion.category] ?? categoryColorClasses.custom"
                  >
                    {{ categoryLabels[criterion.category] ?? criterion.category }}
                  </span>
                </div>
                <p v-if="criterion.description" class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                  {{ criterion.description }}
                </p>
              </div>
              <button
                type="button"
                class="rounded p-1 text-surface-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors shrink-0"
                title="Remove"
                @click="removeCriterion(criterion.key)"
              >
                <Trash2 class="size-4" />
              </button>
            </div>

            <!-- Weight slider -->
            <div class="flex items-center gap-4">
              <label class="text-xs font-medium text-surface-500 dark:text-surface-400 shrink-0 w-12">Weight</label>
              <input
                type="range"
                :min="0"
                :max="100"
                v-model.number="criterion.weight"
                class="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-brand-600 bg-surface-200 dark:bg-surface-700"
              />
              <span class="text-xs font-mono font-semibold text-surface-700 dark:text-surface-300 w-8 text-right">
                {{ criterion.weight }}
              </span>
            </div>

            <div class="flex items-center gap-4 mt-2 text-xs text-surface-400">
              <span>Max score: {{ criterion.maxScore }}</span>
              <span>Key: <code class="rounded bg-surface-100 dark:bg-surface-800 px-1 py-0.5 font-mono text-[10px]">{{ criterion.key }}</code></span>
            </div>
          </div>
        </div>

        <!-- Add another criterion -->
        <button
          v-if="!showCustomForm"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-surface-300 dark:border-surface-700 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
          @click="showCustomForm = true"
        >
          <Plus class="size-4" />
          Add criterion
        </button>

        <!-- Save / Reset bar -->
        <div class="flex items-center gap-3 pt-4 border-t border-surface-200 dark:border-surface-800">
          <button
            type="button"
            :disabled="isSaving || !hasUnsavedChanges"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="saveCriteria"
          >
            <Loader2 v-if="isSaving" class="size-4 animate-spin" />
            <Save v-else class="size-4" />
            Save criteria
          </button>
          <span v-if="hasUnsavedChanges" class="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>
        </div>
      </div>

      <!-- Custom criterion form -->
      <div v-if="showCustomForm" class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 p-5 space-y-4 mt-6">
        <h3 class="text-sm font-semibold text-surface-800 dark:text-surface-200">Add custom criterion</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Name *</label>
            <input
              v-model="customCriterionForm.name"
              @input="customCriterionForm.key = autoGenerateKey(customCriterionForm.name)"
              type="text"
              placeholder="e.g. React Expertise"
              class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Category</label>
            <select
              v-model="customCriterionForm.category"
              class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Description</label>
          <textarea
            v-model="customCriterionForm.description"
            rows="2"
            placeholder="Describe what the AI should evaluate for this criterion..."
            class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Max Score</label>
            <input
              v-model.number="customCriterionForm.maxScore"
              type="number"
              min="1"
              max="100"
              class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Initial Weight (0–100)</label>
            <input
              v-model.number="customCriterionForm.weight"
              type="number"
              min="0"
              max="100"
              class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div class="flex items-center gap-3 pt-2">
          <button
            type="button"
            :disabled="!customCriterionForm.name"
            class="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="addCustomCriterion"
          >
            Add criterion
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
            @click="showCustomForm = false"
          >
            Cancel
          </button>
        </div>
      </div>

      <!-- Auto-score toggle -->
      <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 p-5 mt-6">
        <label class="flex items-start gap-3 cursor-pointer">
          <input
            v-model="autoScoreOnApply"
            type="checkbox"
            class="mt-0.5 size-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 cursor-pointer"
            @change="toggleAutoScore"
          />
          <div>
            <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">
              Automatically score every new applicant
            </span>
            <span class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 block leading-relaxed">
              When a candidate applies, AI will automatically analyze their resume against these criteria and assign a score. Requires an AI provider configured in settings plus a resume upload.
            </span>
          </div>
        </label>
      </div>
    </template>
  </div>
</template>
