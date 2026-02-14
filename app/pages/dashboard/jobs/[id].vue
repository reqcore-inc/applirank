<script setup lang="ts">
import { ArrowLeft, Pencil, Trash2, MapPin, Clock, Calendar, Link2, ClipboardCopy, FileText } from 'lucide-vue-next'
import { z } from 'zod'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const jobId = route.params.id as string

const { job, status: fetchStatus, error, updateJob, deleteJob } = useJob(jobId)

useSeoMeta({
  title: computed(() => job.value ? `${job.value.title} — Applirank` : 'Job — Applirank'),
})

// ─────────────────────────────────────────────
// Status transitions
// ─────────────────────────────────────────────

const JOB_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['open', 'archived'],
  open: ['closed', 'archived'],
  closed: ['open', 'archived'],
  archived: ['draft', 'open'],
}

const transitionLabels: Record<string, string> = {
  draft: 'Revert to Draft',
  open: 'Publish',
  closed: 'Close',
  archived: 'Archive',
}

const transitionClasses: Record<string, string> = {
  draft: 'border border-surface-300 text-surface-600 hover:bg-surface-50',
  open: 'bg-success-600 text-white hover:bg-success-700',
  closed: 'bg-warning-600 text-white hover:bg-warning-700',
  archived: 'border border-surface-300 text-surface-600 hover:bg-surface-50',
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
    alert(err.data?.statusMessage ?? 'Failed to delete job')
    isDeleting.value = false
    showDeleteConfirm.value = false
  }
}

// ─────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────

const statusBadgeClasses: Record<string, string> = {
  draft: 'bg-surface-100 text-surface-600',
  open: 'bg-success-50 text-success-700',
  closed: 'bg-warning-50 text-warning-700',
  archived: 'bg-surface-100 text-surface-400',
}

const typeLabels: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
}

// ─────────────────────────────────────────────
// Application link
// ─────────────────────────────────────────────

const requestUrl = useRequestURL()
const applicationUrl = computed(() => {
  const base = `${requestUrl.protocol}//${requestUrl.host}`
  return `${base}/jobs/${job.value?.slug ?? jobId}/apply`
})

const linkCopied = ref(false)

async function copyApplicationLink() {
  try {
    await navigator.clipboard.writeText(applicationUrl.value)
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
  } catch {
    // Fallback for non-HTTPS contexts
    alert(applicationUrl.value)
  }
}

const typeOptions = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]
</script>

<template>
  <div class="max-w-3xl">
    <!-- Back link -->
    <NuxtLink
      to="/dashboard/jobs"
      class="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 mb-6 transition-colors"
    >
      <ArrowLeft class="size-4" />
      Back to Jobs
    </NuxtLink>

    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-12 text-surface-400">
      Loading job…
    </div>

    <!-- Error / not found -->
    <div
      v-else-if="error"
      class="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
    >
      {{ error.statusCode === 404 ? 'Job not found.' : 'Failed to load job.' }}
      <NuxtLink to="/dashboard/jobs" class="underline ml-1">Back to Jobs</NuxtLink>
    </div>

    <!-- Job detail -->
    <template v-else-if="job">
      <!-- VIEW MODE -->
      <div v-if="!isEditing">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 mb-6">
          <div class="min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-2xl font-bold text-surface-900 truncate">{{ job.title }}</h1>
              <span
                class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0"
                :class="statusBadgeClasses[job.status] ?? 'bg-surface-100 text-surface-600'"
              >
                {{ job.status }}
              </span>
            </div>
            <div class="flex items-center gap-4 text-sm text-surface-500">
              <span>{{ typeLabels[job.type] ?? job.type }}</span>
              <span v-if="job.location" class="inline-flex items-center gap-1">
                <MapPin class="size-3.5" />
                {{ job.location }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors"
              @click="startEdit"
            >
              <Pencil class="size-3.5" />
              Edit
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-danger-300 px-3 py-1.5 text-sm font-medium text-danger-600 hover:bg-danger-50 transition-colors"
              @click="showDeleteConfirm = true"
            >
              <Trash2 class="size-3.5" />
              Delete
            </button>
          </div>
        </div>

        <!-- Status transition buttons -->
        <div v-if="allowedTransitions.length > 0" class="flex items-center gap-2 mb-6">
          <span class="text-xs font-medium text-surface-500 mr-1">Actions:</span>
          <button
            v-for="nextStatus in allowedTransitions"
            :key="nextStatus"
            :disabled="isTransitioning"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            :class="transitionClasses[nextStatus] ?? 'border border-surface-300 text-surface-600 hover:bg-surface-50'"
            @click="handleTransition(nextStatus)"
          >
            {{ transitionLabels[nextStatus] ?? nextStatus }}
          </button>
        </div>

        <!-- Description -->
        <div class="rounded-lg border border-surface-200 bg-white p-5 mb-4">
          <h2 class="text-sm font-semibold text-surface-700 mb-2">Description</h2>
          <p v-if="job.description" class="text-sm text-surface-600 whitespace-pre-wrap">{{ job.description }}</p>
          <p v-else class="text-sm text-surface-400 italic">No description provided.</p>
        </div>

        <!-- Meta -->
        <div class="rounded-lg border border-surface-200 bg-white p-5 mb-4">
          <h2 class="text-sm font-semibold text-surface-700 mb-3">Details</h2>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-surface-400">Employment Type</dt>
              <dd class="text-surface-700 font-medium">{{ typeLabels[job.type] ?? job.type }}</dd>
            </div>
            <div>
              <dt class="text-surface-400">Status</dt>
              <dd class="text-surface-700 font-medium capitalize">{{ job.status }}</dd>
            </div>
            <div>
              <dt class="text-surface-400 inline-flex items-center gap-1">
                <Calendar class="size-3.5" />
                Created
              </dt>
              <dd class="text-surface-700 font-medium">{{ new Date(job.createdAt).toLocaleDateString() }}</dd>
            </div>
            <div>
              <dt class="text-surface-400 inline-flex items-center gap-1">
                <Clock class="size-3.5" />
                Updated
              </dt>
              <dd class="text-surface-700 font-medium">{{ new Date(job.updatedAt).toLocaleDateString() }}</dd>
            </div>
          </dl>
        </div>

        <!-- Applications count -->
        <div class="rounded-lg border border-surface-200 bg-white p-5 mb-4">
          <h2 class="text-sm font-semibold text-surface-700 mb-1">Applications</h2>
          <p class="text-2xl font-bold text-surface-900">
            {{ job.applications?.length ?? 0 }}
          </p>
          <p class="text-xs text-surface-400 mt-1">
            Application management coming in a future milestone.
          </p>
        </div>

        <!-- Shareable application link (only when job is open) -->
        <div v-if="job.status === 'open'" class="rounded-lg border border-brand-200 bg-brand-50 p-5 mb-4">
          <div class="flex items-center gap-2 mb-2">
            <Link2 class="size-4 text-brand-600" />
            <h2 class="text-sm font-semibold text-brand-700">Application Link</h2>
          </div>
          <p class="text-xs text-surface-600 mb-3">
            Share this link with candidates so they can apply to this position.
          </p>
          <div class="flex items-center gap-2">
            <input
              type="text"
              readonly
              :value="applicationUrl"
              class="flex-1 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-surface-700 select-all"
            />
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
              @click="copyApplicationLink"
            >
              <ClipboardCopy class="size-3.5" />
              {{ linkCopied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>

        <!-- Application Form Questions -->
        <div class="rounded-lg border border-surface-200 bg-white p-5">
          <div class="flex items-center gap-2 mb-3">
            <FileText class="size-4 text-surface-500" />
            <h2 class="text-sm font-semibold text-surface-700">Application Form Questions</h2>
          </div>
          <p class="text-xs text-surface-400 mb-4">
            Customize the questions applicants must answer when applying. All applications include name, email, and phone by default.
          </p>
          <JobQuestions :job-id="jobId" />
        </div>
      </div>

      <!-- EDIT MODE -->
      <div v-else>
        <h1 class="text-2xl font-bold text-surface-900 mb-6">Edit Job</h1>

        <form class="space-y-5" @submit.prevent="handleSave">
          <!-- Title -->
          <div>
            <label for="edit-title" class="block text-sm font-medium text-surface-700 mb-1">
              Title <span class="text-danger-500">*</span>
            </label>
            <input
              id="edit-title"
              v-model="editForm.title"
              type="text"
              class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              :class="editErrors.title ? 'border-danger-300' : 'border-surface-300'"
            />
            <p v-if="editErrors.title" class="mt-1 text-xs text-danger-600">{{ editErrors.title }}</p>
          </div>

          <!-- Description -->
          <div>
            <label for="edit-description" class="block text-sm font-medium text-surface-700 mb-1">
              Description
            </label>
            <textarea
              id="edit-description"
              v-model="editForm.description"
              rows="5"
              class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
          </div>

          <!-- Location -->
          <div>
            <label for="edit-location" class="block text-sm font-medium text-surface-700 mb-1">
              Location
            </label>
            <input
              id="edit-location"
              v-model="editForm.location"
              type="text"
              class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
          </div>

          <!-- Type -->
          <div>
            <label for="edit-type" class="block text-sm font-medium text-surface-700 mb-1">
              Employment Type
            </label>
            <select
              id="edit-type"
              v-model="editForm.type"
              class="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors bg-white"
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
              class="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ isSaving ? 'Saving…' : 'Save Changes' }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors"
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
          <div class="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 class="text-lg font-semibold text-surface-900 mb-2">Delete Job</h3>
            <p class="text-sm text-surface-600 mb-4">
              Are you sure you want to delete <strong>{{ job.title }}</strong>? This will also delete all associated applications. This action cannot be undone.
            </p>
            <div class="flex justify-end gap-2">
              <button
                :disabled="isDeleting"
                class="rounded-lg border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors"
                @click="showDeleteConfirm = false"
              >
                Cancel
              </button>
              <button
                :disabled="isDeleting"
                class="rounded-lg bg-danger-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-50 transition-colors"
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
