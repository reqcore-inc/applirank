<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Link2,
  ClipboardCopy,
  Rocket,
  FileEdit,
  ExternalLink,
  PartyPopper,
  Copy,
  Eye,
  Briefcase,
  FileText,
  MessageSquare,
  Brain,
  Sparkles,
  Loader2,
  SlidersHorizontal,
} from 'lucide-vue-next'
import { z } from 'zod'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Create Job — Reqcore',
  description: 'Create a new job posting',
})

const localePath = useLocalePath()
const { createJob } = useJobs()
const { track } = useTrack()
const toast = useToast()

type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_select'
  | 'multi_select'
  | 'number'
  | 'date'
  | 'url'
  | 'checkbox'
  | 'file_upload'

type DraftQuestion = {
  id: string
  label: string
  type: QuestionType
  description?: string | null
  required: boolean
  options?: string[] | null
}

// Wizard state
const currentStep = ref<1 | 2 | 3 | 4 | 5>(1)
const steps = [
  { id: 1, title: 'Job details', description: 'Tell applicants about this role.' },
  { id: 2, title: 'Application form', description: 'Design the application form.' },
  { id: 3, title: 'Scoring criteria', description: 'Define how AI evaluates candidates.' },
  { id: 4, title: 'Find candidates', description: 'Post on job boards, engage recruiters.' },
  { id: 5, title: 'Publish & share', description: 'Go live and share with candidates.' },
]

// Step 1: Job details (API-supported fields)
const form = ref({
  title: '',
  description: '',
  location: '',
  type: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'internship',
})

// Step 2: Application form (client-only for now)
const applicationForm = ref({
  requireResume: true,
  requireCoverLetter: false,
  questions: [] as DraftQuestion[],
})

// Step 3: Find candidates (client-only for now)
const findCandidates = ref({
  experienceLevel: 'mid' as 'junior' | 'mid' | 'senior' | 'lead',
  skills: [] as string[],
  enableSourcing: true,
  locationPreference: 'anywhere' as 'onsite' | 'hybrid' | 'remote' | 'anywhere',
})

// Step 3: Scoring criteria
type ScoringCriterionDraft = {
  key: string
  name: string
  description: string
  category: 'technical' | 'experience' | 'soft_skills' | 'education' | 'culture' | 'custom'
  maxScore: number
  weight: number
}
const scoringCriteria = ref<ScoringCriterionDraft[]>([])
const scoringMode = ref<'none' | 'premade' | 'ai' | 'custom'>('none')
const selectedTemplate = ref<'standard' | 'technical' | 'non_technical'>('standard')
const isGeneratingCriteria = ref(false)
const showCustomForm = ref(false)
const editingCriterion = ref<ScoringCriterionDraft | null>(null)
const autoScoreOnApply = ref(false)

const customCriterionForm = ref({
  key: '',
  name: '',
  description: '',
  category: 'custom' as ScoringCriterionDraft['category'],
  maxScore: 10,
  weight: 50,
})

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

async function loadPremadeCriteria(template: 'standard' | 'technical' | 'non_technical') {
  try {
    // Use local pre-made templates (no API call needed)
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
    scoringCriteria.value = templates[template] ?? []
    scoringMode.value = 'premade'
  } catch (err: any) {
    toast.error('Failed to load template', { message: err?.data?.statusMessage })
  }
}

async function generateAiCriteria() {
  if (!form.value.title) {
    toast.warning('Job title required', 'Add a job title in Step 1 first so AI can generate relevant criteria.')
    return
  }
  if (!form.value.description) {
    toast.warning('Job description required', 'Add a job description in Step 1 first so AI can generate relevant criteria.')
    return
  }
  isGeneratingCriteria.value = true
  try {
    const result = await $fetch('/api/ai-config/generate-criteria', {
      method: 'POST',
      body: {
        title: form.value.title,
        description: form.value.description,
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
    scoringMode.value = 'ai'
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
      toast.error('Failed to generate criteria', {
        message: statusMessage || 'An unexpected error occurred. Check your AI settings and try again.',
        statusCode,
      })
    }
  } finally {
    isGeneratingCriteria.value = false
  }
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
  if (scoringMode.value === 'none') scoringMode.value = 'custom'
}

function removeCriterion(key: string) {
  scoringCriteria.value = scoringCriteria.value.filter(c => c.key !== key)
}

function autoGenerateKey(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50)
}

const isSubmitting = ref(false)
const errors = ref<Record<string, string>>({})
const showAddForm = ref(false)
const editingQuestion = ref<DraftQuestion | null>(null)
const linkCopied = ref(false)
const questionActionError = ref<string | null>(null)
const nextQuestionId = ref(1)

// Step 4: Publish & Share
const publishChoice = ref<'publish' | 'draft'>('publish')
const isPublished = ref(false)
const createdJobSlug = ref('')
const createdJobId = ref('')
const finalApplicationLink = ref('')
const linkCopiedFinal = ref(false)

// Validation (only Step 1 is required to submit)
const formSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['full_time', 'part_time', 'contract', 'internship']),
})

function validateStep1(): boolean {
  const result = formSchema.safeParse(form.value)
  if (!result.success) {
    errors.value = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString()
      if (field) errors.value[field] = issue.message
    }
    return false
  }
  errors.value = {}
  return true
}

const canGoNext = computed(() => {
  if (currentStep.value === 1) return validateStep1()
  return true
})

function nextStep() {
  if (currentStep.value < 5) {
    if (currentStep.value === 1 && !validateStep1()) return
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value--
}

function handleAddQuestion(data: {
  label: string
  type: string
  description?: string
  required: boolean
  options?: string[]
}) {
  applicationForm.value.questions.push({
    id: `draft-${nextQuestionId.value++}`,
    label: data.label,
    type: data.type as QuestionType,
    description: data.description ?? null,
    required: data.required,
    options: data.options ?? null,
  })
  showAddForm.value = false
  questionActionError.value = null
}

function handleUpdateQuestion(data: {
  label: string
  type: string
  description?: string
  required: boolean
  options?: string[]
}) {
  if (!editingQuestion.value) return

  const index = applicationForm.value.questions.findIndex((q) => q.id === editingQuestion.value?.id)
  if (index === -1) return

  const existingQuestion = applicationForm.value.questions[index]
  if (!existingQuestion) return

  applicationForm.value.questions[index] = {
    id: existingQuestion.id,
    label: data.label,
    type: data.type as QuestionType,
    description: data.description ?? null,
    required: data.required,
    options: data.options ?? null,
  }
  editingQuestion.value = null
  questionActionError.value = null
}

function handleDeleteQuestion(questionId: string) {
  const index = applicationForm.value.questions.findIndex((q) => q.id === questionId)
  if (index === -1) return
  applicationForm.value.questions.splice(index, 1)
  if (editingQuestion.value?.id === questionId) {
    editingQuestion.value = null
  }
  questionActionError.value = null
}

function moveQuestion(index: number, direction: 'up' | 'down') {
  const list = applicationForm.value.questions
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= list.length) return
  ;[list[index], list[targetIndex]] = [list[targetIndex]!, list[index]!]
}

function slugifyTitle(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

const requestUrl = useRequestURL()
const applicationLink = computed(() => {
  const base = `${requestUrl.protocol}//${requestUrl.host}`
  const slugBase = slugifyTitle(form.value.title) || 'new-job'
  return `${base}/jobs/${slugBase}-xxxxxxxx/apply`
})

async function copyApplicationLink() {
  try {
    await navigator.clipboard.writeText(applicationLink.value)
    linkCopied.value = true
    setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch {
    // ignore clipboard issues silently
  }
}

function addSkillFromInput(e: Event) {
  const input = e.target as HTMLInputElement
  const value = input.value.trim()
  if (!value) return
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((skill) => {
      if (!findCandidates.value.skills.includes(skill)) {
        findCandidates.value.skills.push(skill)
      }
    })
  input.value = ''
}

function removeSkill(index: number) {
  findCandidates.value.skills.splice(index, 1)
}

async function handleSubmit(mode: 'publish' | 'draft' = publishChoice.value) {
  // Ensure step 1 is valid before submit
  if (!validateStep1()) {
    currentStep.value = 1
    return
  }

  isSubmitting.value = true
  try {
    const created = await createJob({
      title: form.value.title,
      description: form.value.description || undefined,
      location: form.value.location || undefined,
      type: form.value.type,
      requireResume: applicationForm.value.requireResume,
      requireCoverLetter: applicationForm.value.requireCoverLetter,
      autoScoreOnApply: autoScoreOnApply.value,
    })

    track('job_created')

    if (applicationForm.value.questions.length > 0 && created?.id) {
      await Promise.all(
        applicationForm.value.questions.map((question, index) => (
          $fetch(`/api/jobs/${created.id}/questions`, {
            method: 'POST',
            body: {
              label: question.label,
              type: question.type,
              description: question.description || undefined,
              required: question.required,
              options: question.options || undefined,
              displayOrder: index,
            },
          })
        )),
      )
    }

    // Save scoring criteria if any were configured
    if (scoringCriteria.value.length > 0 && created?.id) {
      try {
        await $fetch(`/api/jobs/${created.id}/criteria`, {
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
      } catch {
        // Non-blocking: criteria can be added later from job settings
      }
    }

    if (mode === 'publish' && created?.id) {
      // Publish the job immediately
      await $fetch(`/api/jobs/${created.id}`, {
        method: 'PATCH',
        body: { status: 'open' },
      })

      // Build the real application link
      const base = `${requestUrl.protocol}//${requestUrl.host}`
      const slug = created.slug || created.id
      finalApplicationLink.value = `${base}/jobs/${slug}/apply`
      createdJobSlug.value = slug
      createdJobId.value = created.id

      track('job_published')

      // Auto-copy to clipboard
      try {
        await navigator.clipboard.writeText(finalApplicationLink.value)
        linkCopiedFinal.value = true
        setTimeout(() => { linkCopiedFinal.value = false }, 3000)
      } catch {
        // Clipboard may not be available
      }

      isPublished.value = true
    } else {
      // Saved as draft — go to jobs list
      await navigateTo(localePath('/dashboard/jobs'))
    }
  } catch (err: any) {
    const statusMessage = err?.data?.statusMessage ?? 'Something went wrong while creating the job.'
    toast.error('Failed to create job', {
      message: statusMessage,
      statusCode: err?.data?.statusCode,
    })
  } finally {
    isSubmitting.value = false
  }
}

async function copyFinalLink() {
  try {
    await navigator.clipboard.writeText(finalApplicationLink.value)
    linkCopiedFinal.value = true
    setTimeout(() => { linkCopiedFinal.value = false }, 3000)
  } catch {
    // fallback: show the link so the user can copy manually
    toast.info(finalApplicationLink.value)
  }
}

const typeOptions = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

const questionTypeLabels: Record<QuestionType, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  single_select: 'Single Select',
  multi_select: 'Multi Select',
  number: 'Number',
  date: 'Date',
  url: 'URL',
  checkbox: 'Checkbox',
  file_upload: 'File Upload',
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <!-- Header with top actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <NuxtLink
          :to="$localePath('/dashboard')"
          class="inline-flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-2 transition-colors"
        >
          <ArrowLeft class="size-4" />
          Back to Jobs
        </NuxtLink>
        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-100">New Job</h1>
      </div>
      <div v-if="!isPublished" class="flex items-center gap-3">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          @click="handleSubmit('draft')"
          :disabled="isSubmitting"
        >
          Save draft
        </button>
        <button
          v-if="currentStep < 5"
          type="button"
          :disabled="!canGoNext"
          @click="nextStep"
          class="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          Save & continue
        </button>
      </div>
    </div>

    <!-- Stepper -->
    <div class="mb-10">
      <ol class="flex items-center w-full gap-2">
        <li
          v-for="(step, idx) in steps"
          :key="step.id"
          class="flex items-center flex-1 min-w-0"
          :class="{ 'cursor-pointer': currentStep > step.id }"
          @click="currentStep > step.id ? (currentStep = step.id as typeof currentStep) : undefined"
        >
          <div class="flex items-center gap-2 min-w-0">
            <div
              class="flex items-center justify-center size-7 rounded-full border text-xs font-medium shrink-0 transition-all"
              :class="[
                currentStep === step.id
                  ? 'bg-brand-600 text-white border-brand-600 ring-2 ring-brand-100 dark:ring-brand-950'
                  : currentStep > step.id
                    ? 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800'
                    : 'bg-white dark:bg-surface-900 text-surface-400 dark:text-surface-500 border-surface-200 dark:border-surface-800'
              ]"
            >
              <span v-if="currentStep > step.id" class="text-xs">&#10003;</span>
              <span v-else>{{ step.id }}</span>
            </div>
            <span
              class="text-xs font-medium truncate hidden sm:inline"
              :class="currentStep >= step.id ? 'text-surface-900 dark:text-surface-100' : 'text-surface-400 dark:text-surface-500'"
            >
              {{ step.title }}
            </span>
          </div>
          <div
            v-if="idx < steps.length - 1"
            class="flex-1 h-0.5 mx-2 rounded-full transition-colors"
            :class="currentStep > step.id ? 'bg-brand-600' : 'bg-surface-200 dark:bg-surface-800'"
          />
        </li>
      </ol>
    </div>

    <!-- Main Layout: Form + Tips -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Left side: Form -->
      <div class="lg:col-span-8 space-y-6">

        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-sm overflow-hidden">
          <form @submit.prevent="() => handleSubmit()" class="p-6 md:p-8">
            <!-- Step 1: Job details -->
            <section v-if="currentStep === 1" class="space-y-10">
              <!-- Section: Job title and department -->
              <div class="space-y-6">
                <div>
                  <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-6 pb-2 border-b border-surface-100 dark:border-surface-800">Job title and department</h2>
                  <label for="title" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    Job title <span class="text-danger-500">*</span>
                  </label>
                  <input
                    id="title"
                    v-model="form.title"
                    type="text"
                    placeholder="e.g. Senior Frontend Engineer"
                    class="w-full rounded-lg border px-3 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    :class="errors.title ? 'border-danger-300 ring-1 ring-danger-100' : 'border-surface-300 dark:border-surface-700'"
                  />
                  <p v-if="errors.title" class="mt-1.5 text-xs text-danger-600 dark:text-danger-400 font-medium">{{ errors.title }}</p>
                  <p v-else class="mt-1.5 text-xs text-surface-500">80 characters left. No special characters.</p>
                </div>
              </div>

              <!-- Section: Location -->
              <div class="space-y-6">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-6 pb-2 border-b border-surface-100 dark:border-surface-800">Location</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label for="location" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Office location
                    </label>
                    <input
                      id="location"
                      v-model="form.location"
                      type="text"
                      placeholder="e.g. New York, NY 10019, United States"
                      class="w-full rounded-lg border px-3 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors border-surface-300 dark:border-surface-700"
                    />
                  </div>
                  <div>
                    <label for="type" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Workplace type
                    </label>
                    <select
                      id="type"
                      v-model="form.type"
                      class="w-full rounded-lg border px-3 py-2.5 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors bg-white dark:bg-surface-900 border-surface-300 dark:border-surface-700"
                    >
                      <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Section: Description -->
              <div class="space-y-6">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-6 pb-2 border-b border-surface-100 dark:border-surface-800">Description</h2>
                <div>
                  <label for="description" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    About the role
                  </label>
                  <textarea
                    id="description"
                    v-model="form.description"
                    rows="10"
                    placeholder="Describe the role, responsibilities, and requirements…"
                    class="w-full rounded-lg border px-4 py-3 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors border-surface-300 dark:border-surface-700"
                  />
                  <p class="mt-2 text-xs text-surface-500">Minimum 700 characters recommended.</p>
                </div>
              </div>
            </section>

            <!-- Step 2: Application form -->
            <section v-else-if="currentStep === 2" class="space-y-8">
              <div class="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950 p-5">
                <div class="flex items-center gap-2 mb-2">
                  <Link2 class="size-4 text-brand-600 dark:text-brand-400" />
                  <h2 class="text-sm font-semibold text-brand-700 dark:text-brand-300">Application Link</h2>
                </div>
                <p class="text-xs text-surface-600 dark:text-surface-400 mb-3">
                  This preview link will be generated when the job is created.
                </p>
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    readonly
                    :value="applicationLink"
                    class="flex-1 rounded-lg border border-brand-200 dark:border-brand-800 bg-white dark:bg-surface-900 px-3 py-1.5 text-sm text-surface-700 dark:text-surface-300 select-all"
                  />
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                    @click="copyApplicationLink"
                  >
                    <ClipboardCopy class="size-3.5" />
                    {{ linkCopied ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
              </div>

              <div>
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-6 pb-2 border-b border-surface-100 dark:border-surface-800">Application requirements</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    class="relative flex items-center gap-3 p-4 rounded-xl border text-left transition-colors"
                    :class="applicationForm.requireResume
                      ? 'border-brand-300 dark:border-brand-700 bg-brand-50/70 dark:bg-brand-950/30'
                      : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50'"
                    :aria-pressed="applicationForm.requireResume"
                    @click="applicationForm.requireResume = !applicationForm.requireResume"
                  >
                    <span
                      v-if="applicationForm.requireResume"
                      class="absolute top-3 right-3 inline-flex items-center justify-center size-5 rounded-full bg-brand-600 text-white"
                      aria-hidden="true"
                    >
                      <Check class="size-3" />
                    </span>
                    <div>
                      <span class="block text-sm font-medium text-surface-900 dark:text-surface-100">Require resume/CV</span>
                      <span class="text-xs text-surface-500">Candidates must upload a file.</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    class="relative flex items-center gap-3 p-4 rounded-xl border text-left transition-colors"
                    :class="applicationForm.requireCoverLetter
                      ? 'border-brand-300 dark:border-brand-700 bg-brand-50/70 dark:bg-brand-950/30'
                      : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50'"
                    :aria-pressed="applicationForm.requireCoverLetter"
                    @click="applicationForm.requireCoverLetter = !applicationForm.requireCoverLetter"
                  >
                    <span
                      v-if="applicationForm.requireCoverLetter"
                      class="absolute top-3 right-3 inline-flex items-center justify-center size-5 rounded-full bg-brand-600 text-white"
                      aria-hidden="true"
                    >
                      <Check class="size-3" />
                    </span>
                    <div>
                      <span class="block text-sm font-medium text-surface-900 dark:text-surface-100">Ask for cover letter</span>
                      <span class="text-xs text-surface-500">Optional for candidates.</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-6 pb-2 border-b border-surface-100 dark:border-surface-800">
                  <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100">Custom questions</h2>
                </div>
                <div
                  v-if="questionActionError"
                  class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-sm text-danger-700 dark:text-danger-400 mb-4"
                >
                  {{ questionActionError }}
                  <button class="ml-2 underline" @click="questionActionError = null">Dismiss</button>
                </div>

                <div v-if="applicationForm.questions.length > 0" class="space-y-2 mb-4">
                  <div
                    v-for="(q, index) in applicationForm.questions"
                    :key="q.id"
                    class="flex items-center gap-3 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-3 group"
                  >
                    <div class="text-surface-300">
                      <GripVertical class="size-4" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{{ q.label }}</span>
                        <span v-if="q.required" class="text-xs text-danger-500 font-medium">Required</span>
                      </div>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-xs text-surface-400">{{ questionTypeLabels[q.type] ?? q.type }}</span>
                        <span v-if="q.description" class="text-xs text-surface-400 truncate">
                          - {{ q.description }}
                        </span>
                        <span
                          v-if="(q.type === 'single_select' || q.type === 'multi_select') && q.options"
                          class="text-xs text-surface-400"
                        >
                          · {{ q.options.length }} options
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        :disabled="index === 0"
                        class="rounded p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-30"
                        title="Move up"
                        @click="moveQuestion(index, 'up')"
                      >
                        <ChevronUp class="size-4" />
                      </button>
                      <button
                        type="button"
                        :disabled="index === applicationForm.questions.length - 1"
                        class="rounded p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-30"
                        title="Move down"
                        @click="moveQuestion(index, 'down')"
                      >
                        <ChevronDown class="size-4" />
                      </button>
                      <button
                        type="button"
                        class="rounded p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                        title="Edit"
                        @click="editingQuestion = q; showAddForm = false"
                      >
                        <Pencil class="size-4" />
                      </button>
                      <button
                        type="button"
                        class="rounded p-1 text-surface-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors"
                        title="Delete"
                        @click="handleDeleteQuestion(q.id)"
                      >
                        <Trash2 class="size-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <p v-else class="text-sm text-surface-400 py-4">
                  No custom questions yet. Applicants will see only the standard fields (name, email, phone).
                </p>

                <QuestionForm
                  v-if="editingQuestion"
                  :question="editingQuestion"
                  class="mb-4"
                  @save="handleUpdateQuestion"
                  @cancel="editingQuestion = null"
                />

                <QuestionForm
                  v-if="showAddForm && !editingQuestion"
                  class="mb-4"
                  @save="handleAddQuestion"
                  @cancel="showAddForm = false"
                />

                <button
                  v-if="!showAddForm && !editingQuestion"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-surface-300 dark:border-surface-700 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
                  @click="showAddForm = true"
                >
                  <Plus class="size-4" />
                  Add Question
                </button>
              </div>
            </section>

            <!-- Step 3: Scoring criteria -->
            <section v-else-if="currentStep === 3" class="space-y-8">
              <div>
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2 pb-2 border-b border-surface-100 dark:border-surface-800">
                  AI Candidate Scoring
                </h2>
                <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">
                  Define the criteria that AI will use to evaluate and rank candidates. Adjust weights to prioritize what matters most.
                </p>
              </div>

              <!-- Mode selection cards -->
              <div v-if="scoringCriteria.length === 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Pre-made templates -->
                <button
                  type="button"
                  class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md"
                  :class="scoringMode === 'premade'
                    ? 'border-brand-500 dark:border-brand-400 bg-brand-50/70 dark:bg-brand-950/30 ring-2 ring-brand-200 dark:ring-brand-900'
                    : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700'"
                  @click="scoringMode = 'premade'"
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
                  class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md"
                  :class="scoringMode === 'ai'
                    ? 'border-brand-500 dark:border-brand-400 bg-brand-50/70 dark:bg-brand-950/30 ring-2 ring-brand-200 dark:ring-brand-900'
                    : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700'"
                  @click="generateAiCriteria(); scoringMode = 'ai'"
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
                  class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md"
                  :class="scoringMode === 'custom'
                    ? 'border-brand-500 dark:border-brand-400 bg-brand-50/70 dark:bg-brand-950/30 ring-2 ring-brand-200 dark:ring-brand-900'
                    : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700'"
                  @click="scoringMode = 'custom'; showCustomForm = true"
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
              <div v-if="scoringMode === 'premade' && scoringCriteria.length === 0" class="space-y-4 mt-4">
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
                    @click="selectedTemplate = tmpl.key; loadPremadeCriteria(tmpl.key)"
                  >
                    <span class="block text-sm font-medium text-surface-900 dark:text-surface-100">{{ tmpl.label }}</span>
                    <span class="text-xs text-surface-500">{{ tmpl.desc }}</span>
                  </button>
                </div>
              </div>

              <!-- Criteria list with weight sliders -->
              <div v-if="scoringCriteria.length > 0" class="space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-surface-800 dark:text-surface-200">
                    {{ scoringCriteria.length }} {{ scoringCriteria.length === 1 ? 'criterion' : 'criteria' }} configured
                  </h3>
                  <button
                    type="button"
                    class="text-xs text-danger-600 dark:text-danger-400 hover:underline"
                    @click="scoringCriteria = []; scoringMode = 'none'"
                  >
                    Clear all
                  </button>
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
              </div>

              <!-- Custom criterion form -->
              <div v-if="showCustomForm" class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 p-5 space-y-4">
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
              <div v-if="scoringCriteria.length > 0" class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 p-5">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input
                    v-model="autoScoreOnApply"
                    type="checkbox"
                    class="mt-0.5 size-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 cursor-pointer"
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

              <!-- Skip scoring note -->
              <div v-if="scoringCriteria.length === 0 && scoringMode === 'none'" class="text-center py-6 text-sm text-surface-400">
                <p>Scoring criteria are optional. You can skip this step and add them later from job settings.</p>
              </div>
            </section>

            <!-- Step 4: Find candidates -->
            <section v-else-if="currentStep === 4" class="space-y-8">
              <div>
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-6 pb-2 border-b border-surface-100 dark:border-surface-800">Targeting details</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Experience level</label>
                    <select v-model="findCandidates.experienceLevel" class="w-full rounded-lg border px-3 py-2.5 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border-surface-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                      <option value="junior">Junior</option>
                      <option value="mid">Mid</option>
                      <option value="senior">Senior</option>
                      <option value="lead">Lead</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Location preference</label>
                    <select v-model="findCandidates.locationPreference" class="w-full rounded-lg border px-3 py-2.5 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border-surface-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                      <option value="anywhere">Anywhere</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">Onsite</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-6 pb-2 border-b border-surface-100 dark:border-surface-800">Key skills</h2>
                <div class="rounded-lg border border-surface-300 dark:border-surface-700 p-3 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all">
                  <div class="flex flex-wrap gap-2 mb-2">
                    <span
                      v-for="(skill, idx) in findCandidates.skills"
                      :key="skill + idx"
                      class="inline-flex items-center gap-1.5 rounded-full bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200 border border-brand-100 dark:border-brand-900 px-2.5 py-1 text-xs font-medium"
                    >
                      {{ skill }}
                      <button type="button" class="text-brand-400 hover:text-brand-600 dark:hover:text-brand-100 transition-colors" @click="removeSkill(idx)">×</button>
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Type a skill and press Enter..."
                    class="w-full border-0 focus:ring-0 bg-transparent text-sm placeholder:text-surface-400"
                    @keydown.enter.prevent="addSkillFromInput"
                    @blur="addSkillFromInput"
                  />
                </div>
                <p class="mt-2 text-xs text-surface-500">Examples: Vue, TypeScript, Tailwind, GraphQL, AWS</p>
              </div>

              <div class="pt-4">
                <button
                  type="button"
                  class="relative w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors"
                  :class="findCandidates.enableSourcing
                    ? 'border-brand-300 dark:border-brand-700 bg-brand-50/70 dark:bg-brand-950/30'
                    : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50'"
                  :aria-pressed="findCandidates.enableSourcing"
                  @click="findCandidates.enableSourcing = !findCandidates.enableSourcing"
                >
                  <span
                    v-if="findCandidates.enableSourcing"
                    class="absolute top-3 right-3 inline-flex items-center justify-center size-5 rounded-full bg-brand-600 text-white"
                    aria-hidden="true"
                  >
                    <Check class="size-3" />
                  </span>
                  <div>
                    <span class="block text-sm font-medium text-surface-900 dark:text-surface-100">Enable candidate sourcing recommendations</span>
                    <span class="text-xs text-surface-500">Let AI help you find the best matches.</span>
                  </div>
                </button>
              </div>
            </section>

            <!-- Step 4: Publish & Share -->
            <section v-else-if="currentStep === 5" class="space-y-8">
              <!-- Success state after publishing -->
              <div v-if="isPublished" class="text-center py-8">
                <div class="inline-flex items-center justify-center size-16 rounded-full bg-success-100 dark:bg-success-900/30 mb-6">
                  <PartyPopper class="size-8 text-success-600 dark:text-success-400" />
                </div>
                <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">Your job is live!</h2>
                <p class="text-sm text-surface-500 dark:text-surface-400 max-w-md mx-auto mb-8">
                  <strong>{{ form.title }}</strong> has been published and the application link has been copied to your clipboard.
                </p>

                <!-- Application link card -->
                <div class="mx-auto max-w-lg rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950 p-5 mb-8">
                  <div class="flex items-center justify-center gap-2 mb-3">
                    <Link2 class="size-4 text-brand-600 dark:text-brand-400" />
                    <span class="text-sm font-semibold text-brand-700 dark:text-brand-300">Application Link</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      readonly
                      :value="finalApplicationLink"
                      class="flex-1 rounded-lg border border-brand-200 dark:border-brand-800 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 select-all text-center"
                    />
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                      @click="copyFinalLink"
                    >
                      <Copy class="size-3.5" />
                      {{ linkCopiedFinal ? 'Copied!' : 'Copy' }}
                    </button>
                  </div>
                </div>

                <!-- Action buttons -->
                <div class="flex items-center justify-center gap-3">
                  <NuxtLink
                    :to="finalApplicationLink"
                    target="_blank"
                    class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                  >
                    <ExternalLink class="size-4" />
                    Preview form
                  </NuxtLink>
                  <NuxtLink
                    :to="$localePath(`/dashboard/jobs/${createdJobId}`)"
                    class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                  >
                    <Eye class="size-4" />
                    View job
                  </NuxtLink>
                  <NuxtLink
                    :to="$localePath('/dashboard')"
                    class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                  >
                    Go to dashboard
                  </NuxtLink>
                </div>
              </div>

              <!-- Pre-publish state: choose publish or draft -->
              <div v-else>
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2 pb-2 border-b border-surface-100 dark:border-surface-800">Ready to go?</h2>
                <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">
                  Choose how you'd like to save this job. You can always change the status later from the job detail page.
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <!-- Publish now option -->
                  <button
                    type="button"
                    class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all"
                    :class="publishChoice === 'publish'
                      ? 'border-brand-500 dark:border-brand-400 bg-brand-50/70 dark:bg-brand-950/30 ring-2 ring-brand-200 dark:ring-brand-900'
                      : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50'"
                    @click="publishChoice = 'publish'"
                  >
                    <span
                      v-if="publishChoice === 'publish'"
                      class="absolute top-3 right-3 inline-flex items-center justify-center size-5 rounded-full bg-brand-600 text-white"
                    >
                      <Check class="size-3" />
                    </span>
                    <div class="inline-flex items-center justify-center size-10 rounded-lg bg-brand-100 dark:bg-brand-900/50">
                      <Rocket class="size-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">Publish now</span>
                      <span class="text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed">
                        Your job goes live immediately. The application link will be copied to your clipboard so you can share it right away.
                      </span>
                    </div>
                  </button>

                  <!-- Save as draft option -->
                  <button
                    type="button"
                    class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all"
                    :class="publishChoice === 'draft'
                      ? 'border-brand-500 dark:border-brand-400 bg-brand-50/70 dark:bg-brand-950/30 ring-2 ring-brand-200 dark:ring-brand-900'
                      : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50'"
                    @click="publishChoice = 'draft'"
                  >
                    <span
                      v-if="publishChoice === 'draft'"
                      class="absolute top-3 right-3 inline-flex items-center justify-center size-5 rounded-full bg-brand-600 text-white"
                    >
                      <Check class="size-3" />
                    </span>
                    <div class="inline-flex items-center justify-center size-10 rounded-lg bg-surface-100 dark:bg-surface-800">
                      <FileEdit class="size-5 text-surface-500 dark:text-surface-400" />
                    </div>
                    <div>
                      <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">Save as draft</span>
                      <span class="text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed">
                        Save for later review. The job won't be visible to candidates until you publish it.
                      </span>
                    </div>
                  </button>
                </div>

                <!-- Summary of what was configured -->
                <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 p-5">
                  <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">Job summary</h3>
                  <dl class="space-y-3 text-sm">
                    <div class="flex items-start gap-3">
                      <dt class="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 shrink-0 w-32">
                        <Briefcase class="size-3.5" /> Title
                      </dt>
                      <dd class="text-surface-900 dark:text-surface-100 font-medium">{{ form.title }}</dd>
                    </div>
                    <div v-if="form.location" class="flex items-start gap-3">
                      <dt class="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 shrink-0 w-32">
                        <Link2 class="size-3.5" /> Location
                      </dt>
                      <dd class="text-surface-900 dark:text-surface-100">{{ form.location }}</dd>
                    </div>
                    <div class="flex items-start gap-3">
                      <dt class="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 shrink-0 w-32">
                        <FileText class="size-3.5" /> Resume
                      </dt>
                      <dd class="text-surface-900 dark:text-surface-100">{{ applicationForm.requireResume ? 'Required' : 'Optional' }}</dd>
                    </div>
                    <div class="flex items-start gap-3">
                      <dt class="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 shrink-0 w-32">
                        <MessageSquare class="size-3.5" /> Questions
                      </dt>
                      <dd class="text-surface-900 dark:text-surface-100">{{ applicationForm.questions.length }} custom {{ applicationForm.questions.length === 1 ? 'question' : 'questions' }}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            <!-- Actions Footer -->
            <div v-if="!isPublished" class="flex items-center justify-between mt-12 pt-8 border-t border-surface-100 dark:border-surface-800">
              <NuxtLink
                :to="$localePath('/dashboard')"
                class="px-6 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                Cancel
              </NuxtLink>

              <div class="flex items-center gap-3">
                <button
                  v-if="currentStep > 1"
                  type="button"
                  @click="prevStep"
                  class="px-6 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  Back
                </button>
                <button
                  v-if="currentStep < 5"
                  type="button"
                  :disabled="!canGoNext"
                  @click="nextStep"
                  class="px-8 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Save & continue
                </button>
                <button
                  v-else
                  type="submit"
                  :disabled="isSubmitting"
                  class="inline-flex items-center gap-2 px-8 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  :class="publishChoice === 'publish' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-surface-600 hover:bg-surface-700'"
                >
                  <Rocket v-if="publishChoice === 'publish'" class="size-4" />
                  <FileEdit v-else class="size-4" />
                  {{ isSubmitting
                    ? (publishChoice === 'publish' ? 'Publishing...' : 'Saving...')
                    : (publishChoice === 'publish' ? 'Publish & copy link' : 'Save as draft')
                  }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Right side: Tips -->
      <aside class="lg:col-span-4 space-y-6">
        <div class="sticky top-8 space-y-6">
          <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50 p-6">
            <h3 class="text-sm font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider mb-4">Tips</h3>
            <ul class="space-y-4">
              <li v-if="currentStep === 1" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">Use common job titles</p>
                Advertise for just one job e.g. 'Nurse', not 'nurses'.
              </li>
              <li v-if="currentStep === 1" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">Office location</p>
                Use a location to attract the most appropriate candidates. Some job boards require a location.
              </li>
              <li v-if="currentStep === 1" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">Format description</p>
                Format into sections and lists to improve readability.
              </li>
              <li v-if="currentStep === 2" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">Keep it short</p>
                Too many questions can deter candidates. Stick to 3-5 essential questions.
              </li>
              <li v-if="currentStep === 3" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">Start with a template</p>
                Pre-made criteria cover the most common evaluation patterns. You can always customize them after.
              </li>
              <li v-if="currentStep === 3" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">Adjust weights</p>
                Use the sliders to prioritize what matters most. Higher weight = more influence on the final score.
              </li>
              <li v-if="currentStep === 4" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">Be specific with skills</p>
                Adding specific skills helps our AI better match candidates to your role.
              </li>
              <li v-if="currentStep === 5" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">Publish when ready</p>
                Publishing makes the job visible to candidates. You can unpublish at any time from the job settings.
              </li>
              <li v-if="currentStep === 5" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">Share the link</p>
                After publishing, the application link is automatically copied. Paste it in emails, Slack, or social media.
              </li>
              <li v-if="currentStep === 5" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">Drafts are private</p>
                Draft jobs are only visible to your team. Candidates cannot see or apply to draft jobs.
              </li>
            </ul>
          </div>
          
          <div v-if="currentStep === 1" class="p-6 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/30">
            <h4 class="text-sm font-semibold text-brand-900 dark:text-brand-100 mb-2">Need help?</h4>
            <p class="text-xs text-brand-700 dark:text-brand-300 leading-relaxed">
              Our AI can help you write a compelling job description. Click the magic wand icon in the editor.
            </p>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
button:not(:disabled) {
  cursor: pointer;
}
</style>
