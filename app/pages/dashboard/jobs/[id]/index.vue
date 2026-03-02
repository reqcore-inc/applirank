<script setup lang="ts">
import { Pencil, Trash2, MapPin, Clock, Calendar, UserPlus } from 'lucide-vue-next'
import { z } from 'zod'
import { usePreviewReadOnly } from '~/composables/usePreviewReadOnly'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const jobId = route.params.id as string
const { handlePreviewReadOnlyError } = usePreviewReadOnly()

const { job, status: fetchStatus, error, refresh, updateJob, deleteJob } = useJob(jobId)

useSeoMeta({
  title: computed(() => job.value ? `${job.value.title} — Reqcore` : 'Job — Reqcore'),
})

// ─────────────────────────────────────────────
// Status transitions
// ─────────────────────────────────────────────
import { JOB_STATUS_TRANSITIONS } from '~~/shared/status-transitions'

const transitionLabels: Record<string, string> = {
  draft: 'Revert to Draft',
  open: 'Publish',
  closed: 'Close',
  archived: 'Archive',
}

const transitionClasses: Record<string, string> = {
  draft: 'border border-surface-300 dark:border-surface-700 bg-white/80 dark:bg-surface-900 text-surface-700 dark:text-surface-300 hover:border-surface-400 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800',
  open: 'bg-success-600 text-white shadow-sm shadow-success-900/20 hover:bg-success-700',
  closed: 'bg-warning-600 text-white shadow-sm shadow-warning-900/20 hover:bg-warning-700',
  archived: 'border border-surface-300 dark:border-surface-700 bg-white/80 dark:bg-surface-900 text-surface-700 dark:text-surface-300 hover:border-surface-400 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800',
}

const transitionDotClasses: Record<string, string> = {
  draft: 'bg-surface-400 dark:bg-surface-500',
  open: 'bg-success-200',
  closed: 'bg-warning-200',
  archived: 'bg-surface-400 dark:bg-surface-500',
}

const allowedTransitions = computed(() => {
  if (!job.value) return []
  return JOB_STATUS_TRANSITIONS[job.value.status] ?? []
})

const isTransitioning = ref(false)

async function handleTransition(newStatus: string) {
  isTransitioning.value = true
  try {
    await updateJob({ status: newStatus as any })
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    alert(err.data?.statusMessage ?? 'Failed to update status')
  } finally {
    isTransitioning.value = false
  }
}

// ─────────────────────────────────────────────
// Edit mode
// ─────────────────────────────────────────────

const isEditing = ref(false)
const editForm = ref({
  title: '',
  description: '',
  location: '',
  type: 'full_time' as string,
})

function startEdit() {
  if (!job.value) return
  editForm.value = {
    title: job.value.title,
    description: job.value.description ?? '',
    location: job.value.location ?? '',
    type: job.value.type,
  }
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  editErrors.value = {}
}

const editSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['full_time', 'part_time', 'contract', 'internship']),
})

const isSaving = ref(false)
const editErrors = ref<Record<string, string>>({})

async function handleSave() {
  const result = editSchema.safeParse(editForm.value)
  if (!result.success) {
    editErrors.value = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString()
      if (field) editErrors.value[field] = issue.message
    }
    return
  }
  editErrors.value = {}

  isSaving.value = true
  try {
    await updateJob({
      title: editForm.value.title,
      description: editForm.value.description || undefined,
      location: editForm.value.location || undefined,
      type: editForm.value.type as any,
    })
    isEditing.value = false
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    alert(err.data?.statusMessage ?? 'Failed to save changes')
  } finally {
    isSaving.value = false
  }
}

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────

const isDeleting = ref(false)
const showDeleteConfirm = ref(false)

async function handleDelete() {
  isDeleting.value = true
  try {
    await deleteJob()
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    alert(err.data?.statusMessage ?? 'Failed to delete job')
    isDeleting.value = false
    showDeleteConfirm.value = false
  }
}

// ─────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────

const statusBadgeClasses: Record<string, string> = {
  draft: 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400',
  open: 'bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-400',
  closed: 'bg-warning-50 dark:bg-warning-950 text-warning-700 dark:text-warning-400',
  archived: 'bg-surface-100 dark:bg-surface-800 text-surface-400',
}

const typeLabels: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
}

const typeOptions = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

// ─────────────────────────────────────────────
// Apply candidate modal
// ─────────────────────────────────────────────

const showApplyModal = ref(false)

function handleCandidateApplied() {
  showApplyModal.value = false
  refresh()
}

// ─────────────────────────────────────────────
// Applicants chart (last 14 days)
// ─────────────────────────────────────────────

const APPLICANTS_CHART_DAYS = 14

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const applicantsTrend = computed(() => {
  const countsByDay: Record<string, number> = {}
  const applications = job.value?.applications ?? []

  for (const application of applications) {
    const createdAt = new Date(application.createdAt)
    if (Number.isNaN(createdAt.getTime())) continue
    const key = getLocalDateKey(createdAt)
    countsByDay[key] = (countsByDay[key] ?? 0) + 1
  }

  const end = new Date()
  end.setHours(0, 0, 0, 0)

  const points: Array<{
    key: string
    label: string
    shortLabel: string
    count: number
    heightPercent: number
  }> = []

  for (let offset = APPLICANTS_CHART_DAYS - 1; offset >= 0; offset--) {
    const date = new Date(end)
    date.setDate(end.getDate() - offset)

    const key = getLocalDateKey(date)
    const count = countsByDay[key] ?? 0

    points.push({
      key,
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      shortLabel: date.toLocaleDateString(undefined, { day: 'numeric' }),
      count,
      heightPercent: 0,
    })
  }

  const maxCount = Math.max(1, ...points.map(point => point.count))

  return points.map(point => ({
    ...point,
    heightPercent: point.count === 0 ? 6 : Math.max((point.count / maxCount) * 100, 12),
  }))
})

const applicantsInWindow = computed(() =>
  applicantsTrend.value.reduce((total, point) => total + point.count, 0),
)
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-12 text-surface-400">
      Loading job…
    </div>

    <!-- Error / not found -->
    <div
      v-else-if="error"
      class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-4 text-sm text-danger-700 dark:text-danger-400"
    >
      {{ error.statusCode === 404 ? 'Job not found.' : 'Failed to load job.' }}
      <NuxtLink :to="$localePath('/dashboard/jobs')" class="underline ml-1">Back to Jobs</NuxtLink>
    </div>

    <!-- Job detail -->
    <template v-else-if="job">
      <!-- VIEW MODE -->
      <div v-if="!isEditing">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 mb-6">
          <div class="min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100 truncate">{{ job.title }}</h1>
              <span
                class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0"
                :class="statusBadgeClasses[job.status] ?? 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'"
              >
                {{ job.status }}
              </span>
            </div>
            <div class="flex items-center gap-4 text-sm text-surface-500 dark:text-surface-400">
              <span>{{ typeLabels[job.type] ?? job.type }}</span>
              <span v-if="job.location" class="inline-flex items-center gap-1">
                <MapPin class="size-3.5" />
                {{ job.location }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              @click="startEdit"
            >
              <Pencil class="size-3.5" />
              Edit
            </button>
            <button
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-danger-300 dark:border-danger-700 px-3 py-1.5 text-sm font-medium text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors"
              @click="showDeleteConfirm = true"
            >
              <Trash2 class="size-3.5" />
              Delete
            </button>
          </div>
        </div>

        <!-- Status transition buttons -->
        <div
          v-if="allowedTransitions.length > 0"
          class="mb-6 rounded-xl border border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/70 p-3"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center rounded-full bg-surface-100 dark:bg-surface-800 px-2.5 py-1 text-xs font-medium text-surface-600 dark:text-surface-400">
              Quick actions
            </span>
            <button
              v-for="nextStatus in allowedTransitions"
              :key="nextStatus"
              :disabled="isTransitioning"
              class="inline-flex cursor-pointer items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              :class="transitionClasses[nextStatus] ?? 'border border-surface-300 dark:border-surface-700 bg-white/80 dark:bg-surface-900 text-surface-700 dark:text-surface-300 hover:border-surface-400 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800'"
              @click="handleTransition(nextStatus)"
            >
              <span
                class="mr-2 inline-flex size-1.5 rounded-full"
                :class="transitionDotClasses[nextStatus] ?? 'bg-surface-400 dark:bg-surface-500'"
              />
              {{ transitionLabels[nextStatus] ?? nextStatus }}
            </button>
          </div>
        </div>

        <!-- Description -->
        <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 mb-4">
          <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">Description</h2>
          <MarkdownDescription v-if="job.description" :value="job.description" />
          <p v-else class="text-sm text-surface-400 dark:text-surface-500 italic">No description provided.</p>
        </div>

        <!-- Meta -->
        <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 mb-4">
          <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">Details</h2>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-surface-400 dark:text-surface-500">Employment Type</dt>
              <dd class="text-surface-700 dark:text-surface-300 font-medium">{{ typeLabels[job.type] ?? job.type }}</dd>
            </div>
            <div>
              <dt class="text-surface-400 dark:text-surface-500">Status</dt>
              <dd class="text-surface-700 dark:text-surface-300 font-medium capitalize">{{ job.status }}</dd>
            </div>
            <div>
              <dt class="text-surface-400 dark:text-surface-500 inline-flex items-center gap-1">
                <Calendar class="size-3.5" />
                Created
              </dt>
              <dd class="text-surface-700 dark:text-surface-300 font-medium">{{ new Date(job.createdAt).toLocaleDateString() }}</dd>
            </div>
            <div>
              <dt class="text-surface-400 dark:text-surface-500 inline-flex items-center gap-1">
                <Clock class="size-3.5" />
                Updated
              </dt>
              <dd class="text-surface-700 dark:text-surface-300 font-medium">{{ new Date(job.updatedAt).toLocaleDateString() }}</dd>
            </div>
          </dl>
        </div>

        <!-- Applications summary -->
        <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-300">Applications</h2>
            <button
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              @click="showApplyModal = true"
            >
              <UserPlus class="size-3.5" />
              Add Candidate
            </button>
          </div>
          <p class="text-2xl font-bold text-surface-900 dark:text-surface-100">
            {{ job.applications?.length ?? 0 }}
          </p>
          <p class="text-xs text-surface-400 dark:text-surface-500 mt-1">
            Candidates in the hiring pipeline for this position.
          </p>

          <div class="mt-4 rounded-lg border border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-950/50 p-3">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-xs font-medium text-surface-600 dark:text-surface-400">Applicants over time</p>
              <p class="text-xs text-surface-500 dark:text-surface-500">Last {{ APPLICANTS_CHART_DAYS }} days · {{ applicantsInWindow }}</p>
            </div>

            <div class="flex h-24 items-end gap-1.5">
              <div
                v-for="point in applicantsTrend"
                :key="point.key"
                class="group flex h-full flex-1 items-end"
                :title="`${point.label}: ${point.count} applicant${point.count === 1 ? '' : 's'}`"
              >
                <div
                  class="w-full rounded-sm bg-brand-300/90 dark:bg-brand-700/70 transition-colors group-hover:bg-brand-500 dark:group-hover:bg-brand-500"
                  :class="point.count === 0 ? 'opacity-35' : ''"
                  :style="{ height: `${point.heightPercent}%` }"
                />
              </div>
            </div>

            <div class="mt-2 flex items-center justify-between text-[11px] text-surface-400 dark:text-surface-500">
              <span>{{ applicantsTrend[0]?.label }}</span>
              <span>{{ applicantsTrend[applicantsTrend.length - 1]?.label }}</span>
            </div>
          </div>
        </div>

        <!-- Apply Candidate Modal -->
        <ApplyCandidateModal
          v-if="showApplyModal"
          :job-id="jobId"
          @close="showApplyModal = false"
          @created="handleCandidateApplied"
        />

      </div>

      <!-- EDIT MODE -->
      <div v-else>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-6">Edit Job</h1>

        <form class="space-y-5" @submit.prevent="handleSave">
          <!-- Title -->
          <div>
            <label for="edit-title" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Title <span class="text-danger-500">*</span>
            </label>
            <input
              id="edit-title"
              v-model="editForm.title"
              type="text"
              class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              :class="editErrors.title ? 'border-danger-300' : 'border-surface-300 dark:border-surface-700'"
            />
            <p v-if="editErrors.title" class="mt-1 text-xs text-danger-600 dark:text-danger-400">{{ editErrors.title }}</p>
          </div>

          <!-- Description -->
          <div>
            <label for="edit-description" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Description
            </label>
            <textarea
              id="edit-description"
              v-model="editForm.description"
              rows="5"
              class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
          </div>

          <!-- Location -->
          <div>
            <label for="edit-location" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Location
            </label>
            <input
              id="edit-location"
              v-model="editForm.location"
              type="text"
              class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
          </div>

          <!-- Type -->
          <div>
            <label for="edit-type" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Employment Type
            </label>
            <select
              id="edit-type"
              v-model="editForm.type"
              class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors bg-white dark:bg-surface-900"
            >
              <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              :disabled="isSaving"
              class="inline-flex cursor-pointer items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ isSaving ? 'Saving…' : 'Save Changes' }}
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-lg border border-surface-300 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              @click="cancelEdit"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Delete confirmation dialog -->
      <Teleport to="body">
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showDeleteConfirm = false" />
          <div class="relative bg-white dark:bg-surface-900 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">Delete Job</h3>
            <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
              Are you sure you want to delete <strong>{{ job.title }}</strong>? This will also delete all associated applications. This action cannot be undone.
            </p>
            <div class="flex justify-end gap-2">
              <button
                :disabled="isDeleting"
                class="cursor-pointer rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                @click="showDeleteConfirm = false"
              >
                Cancel
              </button>
              <button
                :disabled="isDeleting"
                class="cursor-pointer rounded-lg bg-danger-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                @click="handleDelete"
              >
                {{ isDeleting ? 'Deleting…' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>
