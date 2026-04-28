<script setup lang="ts">
import { UserPlus, Pencil, Trash2, MoreHorizontal, Brain } from 'lucide-vue-next'
import { JOB_STATUS_TRANSITIONS } from '~~/shared/status-transitions'

const props = defineProps<{
  jobId: string
}>()

const toast = useToast()
const { track } = useTrack()
const localePath = useLocalePath()
const { handlePreviewReadOnlyError } = usePreviewReadOnly()

const { job, updateJob, deleteJob, refresh: refreshJob } = useJob(props.jobId)

// ─────────────────────────────────────────────
// Job status transitions
// ─────────────────────────────────────────────

const jobTransitionLabels: Record<string, string> = {
  draft: 'Revert to Draft',
  open: 'Publish',
  closed: 'Close',
  archived: 'Archive',
}

const jobTransitionClasses: Record<string, string> = {
  open: 'bg-success-600 text-white hover:bg-success-700',
  closed: 'bg-warning-600 text-white hover:bg-warning-700',
  draft: 'border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800',
  archived: 'border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800',
}

const allowedJobTransitions = computed(() => {
  if (!job.value) return []
  return JOB_STATUS_TRANSITIONS[job.value.status] ?? []
})

const primaryJobTransition = computed(() => allowedJobTransitions.value[0] ?? null)
const secondaryJobTransitions = computed(() => allowedJobTransitions.value.slice(1))

const isJobTransitioning = ref(false)

async function handleJobTransition(newStatus: string) {
  isJobTransitioning.value = true
  try {
    const fromStatus = job.value?.status
    await updateJob({ status: newStatus as any })
    track('job_status_changed', { job_id: props.jobId, from_status: fromStatus, to_status: newStatus })
    await refreshJob()
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error('Failed to update status', { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
  } finally {
    isJobTransitioning.value = false
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
    track('job_deleted', { job_id: props.jobId })
    await deleteJob()
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error('Failed to delete job', { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
    isDeleting.value = false
    showDeleteConfirm.value = false
  }
}

// ─────────────────────────────────────────────
// Add candidate modal
// ─────────────────────────────────────────────

const showApplyModal = ref(false)

function handleCandidateApplied() {
  showApplyModal.value = false
  refreshNuxtData(`pipeline-apps-${props.jobId}`)
}

// ─────────────────────────────────────────────
// Bulk AI scoring
// ─────────────────────────────────────────────

const isScoringAll = ref(false)
const scoringProgress = ref({ done: 0, total: 0 })

async function scoreAllCandidates() {
  isScoringAll.value = true
  scoringProgress.value = { done: 0, total: 0 }
  showMoreMenu.value = false
  try {
    const { applicationIds } = await $fetch(`/api/jobs/${props.jobId}/analyze-all`, {
      method: 'POST',
    })
    scoringProgress.value.total = applicationIds.length
    track('bulk_scoring_started', { job_id: props.jobId, candidate_count: applicationIds.length })
    if (applicationIds.length === 0) {
      toast.info('All candidates scored', 'Every candidate already has a score.')
      return
    }

    let failed = 0
    for (const appId of applicationIds) {
      try {
        await $fetch(`/api/applications/${appId}/analyze`, {
          method: 'POST',
        })
      } catch {
        failed++
      }
      scoringProgress.value.done++
    }
    await refreshNuxtData(`pipeline-apps-${props.jobId}`)
    if (failed === 0) {
      toast.success('Scoring complete', `${applicationIds.length} candidate${applicationIds.length === 1 ? '' : 's'} scored successfully.`)
    } else {
      toast.warning('Scoring partially complete', `${applicationIds.length - failed} scored, ${failed} failed (missing resume or criteria).`)
    }
  } catch (err: any) {
    const statusMessage = err?.data?.statusMessage ?? ''
    if (statusMessage.includes('AI provider not configured') || statusMessage.includes('No scoring criteria')) {
      toast.add({
        type: 'warning',
        title: 'Cannot score candidates',
        message: statusMessage,
        link: statusMessage.includes('AI provider')
          ? { label: 'Go to AI Settings', href: '/dashboard/settings/ai' }
          : undefined,
        duration: 8000,
      })
    } else {
      toast.error('Scoring failed', { message: statusMessage || 'An unexpected error occurred.', statusCode: err?.data?.statusCode })
    }
  } finally {
    isScoringAll.value = false
  }
}

// ─────────────────────────────────────────────
// More menu
// ─────────────────────────────────────────────

const showMoreMenu = ref(false)
const moreMenuRef = ref<HTMLElement | null>(null)
const moreMenuPos = ref({ top: 0, right: 0 })

function openMoreMenu() {
  if (moreMenuRef.value) {
    const rect = moreMenuRef.value.getBoundingClientRect()
    moreMenuPos.value = {
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    }
  }
  showMoreMenu.value = !showMoreMenu.value
}

function handleClickOutside(event: MouseEvent) {
  if (moreMenuRef.value && !moreMenuRef.value.contains(event.target as Node)) {
    showMoreMenu.value = false
  }
}

watch(showMoreMenu, (val) => {
  if (val) {
    setTimeout(() => document.addEventListener('click', handleClickOutside), 0)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <!-- Quick actions teleported to sub-nav bar -->
  <Teleport to="#job-sub-nav-actions">
    <div class="flex items-center gap-2">
      <!-- Add Candidate -->
      <button
        class="hidden sm:inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-surface-200 dark:border-surface-700/80 px-2.5 py-1 text-[11px] font-medium text-surface-600 dark:text-surface-300 hover:bg-white hover:border-surface-300 dark:hover:bg-surface-800 dark:hover:border-surface-600 transition-all duration-150"
        @click="showApplyModal = true"
      >
        <UserPlus class="size-3" />
        Add Candidate
      </button>

      <!-- Primary job action (e.g., Publish) -->
      <button
        v-if="primaryJobTransition"
        :disabled="isJobTransitioning"
        class="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="jobTransitionClasses[primaryJobTransition] ?? 'border border-surface-300 text-surface-600 hover:bg-surface-50'"
        @click="handleJobTransition(primaryJobTransition)"
      >
        {{ jobTransitionLabels[primaryJobTransition] ?? primaryJobTransition }}
      </button>

      <!-- More menu -->
      <div ref="moreMenuRef">
        <button
          class="inline-flex cursor-pointer items-center justify-center rounded-md border border-surface-200 dark:border-surface-700/80 p-1 text-surface-500 hover:bg-white hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-all duration-150"
          @click="openMoreMenu"
        >
          <MoreHorizontal class="size-3.5" />
        </button>

        <Teleport to="body">
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 -translate-y-1"
          >
            <div
              v-if="showMoreMenu"
              :style="{ position: 'fixed', top: moreMenuPos.top + 'px', right: moreMenuPos.right + 'px' }"
              class="z-[200] w-52 rounded-xl border border-surface-200 dark:border-surface-700/80 bg-white dark:bg-surface-900 shadow-xl shadow-surface-900/5 dark:shadow-black/20 py-1.5 origin-top-right"
            >
              <NuxtLink
                :to="localePath(`/dashboard/jobs/${jobId}/settings`)"
                class="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800/80 transition-colors"
                @click="showMoreMenu = false"
              >
                <Pencil class="size-3.5 text-surface-400" />
                Edit Job
              </NuxtLink>
              <button
                class="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800/80 transition-colors sm:hidden"
                @click="showApplyModal = true; showMoreMenu = false"
              >
                <UserPlus class="size-3.5 text-surface-400" />
                Add Candidate
              </button>
              <div class="border-t border-surface-100 dark:border-surface-800 my-1.5 mx-2" />
              <button
                :disabled="isScoringAll"
                class="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800/80 transition-colors disabled:opacity-50"
                @click="scoreAllCandidates()"
              >
                <Brain class="size-3.5 text-surface-400" />
                {{ isScoringAll ? `Scoring ${scoringProgress.done}/${scoringProgress.total}…` : 'Score All Candidates' }}
              </button>
              <template v-if="secondaryJobTransitions.length > 0">
                <div class="border-t border-surface-100 dark:border-surface-800 my-1.5 mx-2" />
                <button
                  v-for="t in secondaryJobTransitions"
                  :key="t"
                  :disabled="isJobTransitioning"
                  class="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800/80 transition-colors disabled:opacity-50"
                  @click="handleJobTransition(t); showMoreMenu = false"
                >
                  {{ jobTransitionLabels[t] ?? t }}
                </button>
              </template>
              <div class="border-t border-surface-100 dark:border-surface-800 my-1.5 mx-2" />
              <button
                class="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/60 transition-colors"
                @click="showDeleteConfirm = true; showMoreMenu = false"
              >
                <Trash2 class="size-3.5" />
                Delete Job
              </button>
            </div>
          </Transition>
        </Teleport>
      </div>
    </div>
  </Teleport>

  <!-- Delete Job Confirm -->
  <Teleport to="body">
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showDeleteConfirm = false" />
      <div class="relative bg-white dark:bg-surface-900 rounded-2xl shadow-2xl shadow-surface-900/10 dark:shadow-black/30 ring-1 ring-surface-200/80 dark:ring-surface-700/60 p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">Delete Job</h3>
        <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
          Are you sure you want to delete <strong>{{ job?.title }}</strong>? This will also delete all associated applications. This action cannot be undone.
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

  <!-- Apply Candidate Modal -->
  <ApplyCandidateModal
    v-if="showApplyModal"
    :job-id="jobId"
    @close="showApplyModal = false"
    @created="handleCandidateApplied"
  />
</template>
