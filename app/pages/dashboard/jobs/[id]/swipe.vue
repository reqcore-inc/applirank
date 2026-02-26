<script setup lang="ts">
import { ArrowLeft, ArrowRight, Briefcase, Clock, Hash, UserRound, Mail, MessageSquare, Hand, FileText, Paperclip, Download, Eye, Phone, Search, ExternalLink } from 'lucide-vue-next'
import { usePreviewReadOnly } from '~/composables/usePreviewReadOnly'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const jobId = route.params.id as string

const { data: jobData, status: jobFetchStatus, error: jobError } = useFetch(
  () => `/api/jobs/${jobId}`,
  {
    key: `swipe-job-${jobId}`,
    headers: useRequestHeaders(['cookie']),
  },
)

const {
  data: appData,
  status: appFetchStatus,
  error: appError,
  refresh: refreshApps,
} = useFetch('/api/applications', {
  key: `swipe-apps-${jobId}`,
  query: { jobId, limit: 100 },
  headers: useRequestHeaders(['cookie']),
})

const PIPELINE_STATUSES = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const
type PipelineStatus = typeof PIPELINE_STATUSES[number]

const applications = computed(() => appData.value?.data ?? [])
const focusStatus = ref<PipelineStatus>('new')

const focusedApplications = computed(() =>
  applications.value.filter((application) => application.status === focusStatus.value),
)
const totalApplications = computed(() => focusedApplications.value.length)

// Search within the focused list
const searchTerm = ref('')
const filteredApplications = computed(() => {
  if (!searchTerm.value.trim()) return focusedApplications.value
  const term = searchTerm.value.toLowerCase()
  return focusedApplications.value.filter((app) => {
    const name = `${app.candidateFirstName} ${app.candidateLastName}`.toLowerCase()
    const email = (app.candidateEmail ?? '').toLowerCase()
    return name.includes(term) || email.includes(term)
  })
})

type StatusCountMap = {
  new: number
  screening: number
  interview: number
  offer: number
  hired: number
  rejected: number
}

const statusCounts = computed(() => {
  const counts: StatusCountMap = {
    new: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
    rejected: 0,
  }

  for (const application of applications.value) {
    switch (application.status) {
      case 'new':
        counts.new += 1
        break
      case 'screening':
        counts.screening += 1
        break
      case 'interview':
        counts.interview += 1
        break
      case 'offer':
        counts.offer += 1
        break
      case 'hired':
        counts.hired += 1
        break
      case 'rejected':
        counts.rejected += 1
        break
      default:
        break
    }
  }

  return counts
})

const currentIndex = ref(0)

watch(focusedApplications, () => {
  if (focusedApplications.value.length === 0) {
    currentIndex.value = 0
    return
  }

  if (currentIndex.value >= focusedApplications.value.length) {
    currentIndex.value = focusedApplications.value.length - 1
  }
}, { immediate: true })

watch(focusStatus, () => {
  currentIndex.value = 0
  searchTerm.value = ''
})

const currentSummary = computed(() => filteredApplications.value[currentIndex.value] ?? null)

// Detail tab for center panel
const detailTab = ref<'overview' | 'documents' | 'responses'>('overview')

type SwipeDocument = {
  id: string
  type: 'resume' | 'cover_letter' | 'other'
  originalFilename: string
  mimeType: string
  createdAt: string | Date
}

type SwipeResponse = {
  id: string
  value: unknown
  question: {
    id: string
    label: string
    type: string
    options: string[] | null
  } | null
}

type SwipeApplicationDetail = {
  id: string
  status: string
  score: number | null
  notes: string | null
  createdAt: string | Date
  updatedAt: string | Date
  candidate: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    documents: SwipeDocument[]
  }
  responses: SwipeResponse[]
}

const currentApplicationId = ref('')

watch(currentSummary, (summary) => {
  if (!summary?.id) return
  currentApplicationId.value = summary.id
}, { immediate: true })

const {
  data: currentApplication,
  status: detailFetchStatus,
  execute: executeDetailFetch,
} = useFetch<SwipeApplicationDetail | null>(
  () => `/api/applications/${currentApplicationId.value}`,
  {
    key: computed(() => `swipe-application-${currentApplicationId.value}`),
    immediate: false,
    headers: useRequestHeaders(['cookie']),
  },
)

const resolvedCurrentApplication = computed(() => {
  if (!currentApplication.value) return null
  return currentApplication.value.id === currentApplicationId.value ? currentApplication.value : null
})

watch(currentApplicationId, async (id) => {
  if (!id) return

  await executeDetailFetch()
}, { immediate: true })

useSeoMeta({
  title: computed(() =>
    jobData.value ? `Swipe Review — ${jobData.value.title} — Applirank` : 'Swipe Review — Applirank',
  ),
  robots: 'noindex, nofollow',
})

const STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['screening', 'interview', 'rejected'],
  screening: ['interview', 'offer', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
  hired: [],
  rejected: ['new'],
}

const statusBadgeClasses: Record<string, string> = {
  new: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400',
  screening: 'bg-info-50 text-info-700 dark:bg-info-950 dark:text-info-400',
  interview: 'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-400',
  offer: 'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-400',
  hired: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-300',
  rejected: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400',
}

const transitionLabels: Record<string, string> = {
  new: 'Re-open',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Reject',
}

const transitionClasses: Record<string, string> = {
  new: 'border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800',
  screening: 'bg-info-600 text-white hover:bg-info-700',
  interview: 'bg-warning-600 text-white hover:bg-warning-700',
  offer: 'bg-success-600 text-white hover:bg-success-700',
  hired: 'bg-success-700 text-white hover:bg-success-800',
  rejected: 'bg-danger-600 text-white hover:bg-danger-700',
}

function formatStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatResponseValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value ?? '—')
}

function formatDocumentType(value: SwipeDocument['type']) {
  if (value === 'cover_letter') return 'Cover Letter'
  if (value === 'resume') return 'Resume'
  return 'Other'
}

function getCandidateInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim().charAt(0) ?? ''
  const last = lastName?.trim().charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || 'C'
}

function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

function scoreClass(score: number) {
  if (score >= 75) return 'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-400'
  if (score >= 40) return 'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-400'
  return 'bg-danger-50 text-danger-700 dark:bg-danger-950 dark:text-danger-400'
}

const allowedTransitions = computed(() => {
  if (!currentSummary.value) return []
  return STATUS_TRANSITIONS[currentSummary.value.status] ?? []
})

function isCurrentStatus(status: string) {
  return currentSummary.value?.status === status
}

function isStatusActionEnabled(status: string) {
  if (!currentSummary.value) return false
  if (isCurrentStatus(status)) return false
  return allowedTransitions.value.includes(status)
}

function isFocusStatus(status: PipelineStatus) {
  return focusStatus.value === status
}

function setFocusStatus(status: PipelineStatus) {
  focusStatus.value = status
}

function selectCandidate(index: number) {
  currentIndex.value = index
}

const isMutating = ref(false)
const { handlePreviewReadOnlyError } = usePreviewReadOnly()

async function changeStatus(status: string) {
  if (!currentSummary.value || isMutating.value) return
  const applicationId = currentSummary.value.id

  isMutating.value = true
  const nextIndex = Math.min(currentIndex.value + 1, Math.max(filteredApplications.value.length - 1, 0))

  try {
    await $fetch(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      body: { status },
    })

    await refreshApps()

    if (filteredApplications.value.length > 1) {
      currentIndex.value = Math.min(nextIndex, filteredApplications.value.length - 1)
    }
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    alert(err?.data?.statusMessage ?? 'Failed to update status')
  } finally {
    isMutating.value = false
  }
}

function goToPreviousCard() {
  if (currentIndex.value === 0) return
  currentIndex.value -= 1
}

function goToNextCard() {
  if (currentIndex.value >= filteredApplications.value.length - 1) return
  currentIndex.value += 1
}

function handleKeyNavigation(event: KeyboardEvent) {
  // Don't trigger navigation when typing in search
  if ((event.target as HTMLElement)?.tagName === 'INPUT') return

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    goToPreviousCard()
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    goToNextCard()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyNavigation)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyNavigation)
})

const isLoading = computed(() => {
  return jobFetchStatus.value === 'pending' || appFetchStatus.value === 'pending'
})
</script>

<template>
  <div class="-mx-6 -my-8 flex h-screen flex-col overflow-hidden">
    <!-- Loading -->
    <div v-if="isLoading" class="flex flex-1 items-center justify-center text-surface-400">
      Loading swipe review…
    </div>

    <!-- Error -->
    <div
      v-else-if="jobError || appError"
      class="m-6 rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
    >
      {{ jobError ? 'Job not found or failed to load.' : 'Failed to load applications.' }}
      <NuxtLink to="/dashboard/jobs" class="ml-1 underline">Back to Jobs</NuxtLink>
    </div>

    <template v-else-if="jobData">
      <!-- ═══════════════════════════════════════ -->
      <!-- TOP HEADER                               -->
      <!-- ═══════════════════════════════════════ -->
      <div class="shrink-0 border-b border-surface-200 bg-white px-5 py-3 dark:border-surface-800 dark:bg-surface-900">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <Hand class="size-5 shrink-0 text-surface-500 dark:text-surface-400" />
            <div class="min-w-0">
              <h1 class="text-lg font-bold text-surface-900 dark:text-surface-50 truncate">
                {{ jobData.title }}
              </h1>
              <p class="text-xs text-surface-500 dark:text-surface-400">
                {{ applications.length }} total application{{ applications.length === 1 ? '' : 's' }}
              </p>
            </div>
          </div>
          <div class="hidden sm:block rounded-md bg-surface-100 px-2.5 py-1 text-xs text-surface-500 dark:bg-surface-800 dark:text-surface-400">
            ↑↓ to navigate
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════ -->
      <!-- PIPELINE STATUS TABS                     -->
      <!-- ═══════════════════════════════════════ -->
      <div class="shrink-0 border-b border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div class="flex items-center overflow-x-auto px-5">
          <button
            v-for="status in PIPELINE_STATUSES"
            :key="`tab-${status}`"
            class="relative flex shrink-0 cursor-pointer items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none"
            :class="isFocusStatus(status)
              ? 'text-brand-600 dark:text-brand-400'
              : 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'"
            @click="setFocusStatus(status)"
          >
            {{ formatStatusLabel(status) }}
            <span
              class="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
              :class="isFocusStatus(status)
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'"
            >
              {{ statusCounts[status] ?? 0 }}
            </span>
            <!-- Active indicator -->
            <span
              v-if="isFocusStatus(status)"
              class="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-brand-600 dark:bg-brand-400"
            />
          </button>
        </div>
      </div>

      <!-- ═══════════════════════════════════════ -->
      <!-- THREE-PANEL LAYOUT                       -->
      <!-- ═══════════════════════════════════════ -->
      <div class="flex flex-1 overflow-hidden">

        <!-- LEFT PANEL — Candidate list -->
        <div class="flex w-72 shrink-0 flex-col border-r border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
          <!-- Search -->
          <div class="shrink-0 border-b border-surface-200 px-3 py-2.5 dark:border-surface-800">
            <div class="relative">
              <Search class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-surface-400" />
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Search by name, email…"
                class="w-full rounded-lg border border-surface-200 bg-surface-50 py-1.5 pl-8 pr-3 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500"
              />
            </div>
          </div>

          <!-- Count bar -->
          <div class="shrink-0 px-3 py-2 text-xs text-surface-500 dark:text-surface-400 border-b border-surface-100 dark:border-surface-800">
            {{ filteredApplications.length }} candidate{{ filteredApplications.length === 1 ? '' : 's' }}
            <span v-if="searchTerm.trim()"> matching</span>
          </div>

          <!-- Scrollable list -->
          <div class="flex-1 overflow-y-auto">
            <div v-if="filteredApplications.length === 0" class="p-6 text-center">
              <p class="text-sm text-surface-500 dark:text-surface-400">
                {{ searchTerm.trim() ? 'No matching candidates.' : `No candidates in ${formatStatusLabel(focusStatus)}.` }}
              </p>
            </div>

            <button
              v-for="(app, idx) in filteredApplications"
              :key="app.id"
              class="flex w-full cursor-pointer items-start gap-3 border-b border-surface-100 px-3 py-3 text-left transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/50"
              :class="currentIndex === idx
                ? 'bg-brand-50/60 dark:bg-brand-950/30 border-l-2 border-l-brand-500'
                : 'border-l-2 border-l-transparent'"
              @click="selectCandidate(idx)"
            >
              <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {{ getCandidateInitials(app.candidateFirstName, app.candidateLastName) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                  {{ app.candidateFirstName }} {{ app.candidateLastName }}
                </p>
                <p class="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-400">
                  {{ app.candidateEmail }}
                </p>
                <div class="mt-1 flex items-center gap-2">
                  <span
                    v-if="app.score != null"
                    class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    :class="scoreClass(app.score)"
                  >
                    {{ app.score }} pts
                  </span>
                  <span class="text-[11px] text-surface-400">{{ timeAgo(app.createdAt) }}</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- CENTER PANEL — Candidate detail -->
        <div class="flex flex-1 flex-col overflow-hidden">
          <!-- Empty state -->
          <div
            v-if="!currentSummary"
            class="flex flex-1 flex-col items-center justify-center p-8 text-center"
          >
            <UserRound class="size-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p class="text-base font-medium text-surface-700 dark:text-surface-200">
              No candidates in {{ formatStatusLabel(focusStatus) }}
            </p>
            <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
              Switch to another pipeline stage to review candidates.
            </p>
          </div>

          <template v-else>
            <!-- Candidate header -->
            <div class="shrink-0 border-b border-surface-200 bg-white px-6 py-5 dark:border-surface-800 dark:bg-surface-900">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-4 min-w-0">
                  <div class="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {{ getCandidateInitials(currentSummary.candidateFirstName, currentSummary.candidateLastName) }}
                  </div>
                  <div class="min-w-0">
                    <h2 class="text-xl font-bold text-surface-900 dark:text-surface-50 truncate">
                      {{ currentSummary.candidateFirstName }} {{ currentSummary.candidateLastName }}
                    </h2>
                    <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-500 dark:text-surface-400">
                      <span class="inline-flex items-center gap-1.5">
                        <Mail class="size-3.5" />
                        {{ currentSummary.candidateEmail }}
                      </span>
                      <span v-if="resolvedCurrentApplication?.candidate.phone" class="inline-flex items-center gap-1.5">
                        <Phone class="size-3.5" />
                        {{ resolvedCurrentApplication.candidate.phone }}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  class="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold capitalize"
                  :class="statusBadgeClasses[currentSummary.status] ?? 'bg-surface-100 text-surface-600'"
                >
                  {{ currentSummary.status }}
                </span>
              </div>
            </div>

            <!-- Detail tabs -->
            <div class="shrink-0 border-b border-surface-200 bg-white px-6 dark:border-surface-800 dark:bg-surface-900">
              <div class="flex gap-1">
                <button
                  class="cursor-pointer px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
                  :class="detailTab === 'overview'
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:hover:text-surface-300'"
                  @click="detailTab = 'overview'"
                >
                  Profile
                </button>
                <button
                  class="cursor-pointer px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
                  :class="detailTab === 'documents'
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:hover:text-surface-300'"
                  @click="detailTab = 'documents'"
                >
                  Documents
                  <span
                    v-if="resolvedCurrentApplication?.candidate.documents?.length"
                    class="ml-1 text-xs text-surface-400"
                  >
                    ({{ resolvedCurrentApplication.candidate.documents.length }})
                  </span>
                </button>
                <button
                  v-if="resolvedCurrentApplication?.responses?.length"
                  class="cursor-pointer px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
                  :class="detailTab === 'responses'
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:hover:text-surface-300'"
                  @click="detailTab = 'responses'"
                >
                  Responses ({{ resolvedCurrentApplication.responses.length }})
                </button>
              </div>
            </div>

            <!-- Detail content -->
            <div class="flex-1 overflow-y-auto bg-surface-50 dark:bg-surface-950 p-6">
              <div v-if="detailFetchStatus === 'pending' && !resolvedCurrentApplication" class="py-8 text-center text-sm text-surface-400">
                Loading details…
              </div>

              <!-- PROFILE TAB -->
              <div v-else-if="detailTab === 'overview'" class="space-y-4 max-w-3xl">
                <!-- Candidate info -->
                <div class="rounded-lg border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
                  <div class="flex items-center gap-2 mb-3">
                    <UserRound class="size-4 text-surface-500 dark:text-surface-400" />
                    <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200">Candidate</h3>
                  </div>
                  <dl class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt class="text-surface-400">Name</dt>
                      <dd class="text-surface-700 dark:text-surface-200 font-medium">
                        {{ currentSummary.candidateFirstName }} {{ currentSummary.candidateLastName }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-surface-400">Email</dt>
                      <dd class="text-surface-700 dark:text-surface-200 font-medium truncate">
                        {{ currentSummary.candidateEmail }}
                      </dd>
                    </div>
                    <div v-if="resolvedCurrentApplication?.candidate.phone">
                      <dt class="text-surface-400">Phone</dt>
                      <dd class="text-surface-700 dark:text-surface-200 font-medium">
                        {{ resolvedCurrentApplication.candidate.phone }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-surface-400">Score</dt>
                      <dd class="font-medium">
                        <span
                          v-if="currentSummary.score != null"
                          class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                          :class="scoreClass(currentSummary.score)"
                        >
                          {{ currentSummary.score }} pts
                        </span>
                        <span v-else class="text-surface-400">—</span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <!-- Application details -->
                <div class="rounded-lg border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
                  <div class="flex items-center gap-2 mb-3">
                    <Briefcase class="size-4 text-surface-500 dark:text-surface-400" />
                    <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200">Application</h3>
                  </div>
                  <dl class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt class="text-surface-400">Applied</dt>
                      <dd class="text-surface-700 dark:text-surface-200 font-medium">
                        {{ new Date(currentSummary.createdAt).toLocaleDateString() }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-surface-400">Updated</dt>
                      <dd class="text-surface-700 dark:text-surface-200 font-medium">
                        {{ new Date(currentSummary.updatedAt).toLocaleDateString() }}
                      </dd>
                    </div>
                  </dl>
                </div>

                <!-- Notes -->
                <div class="rounded-lg border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
                  <div class="flex items-center gap-2 mb-3">
                    <MessageSquare class="size-4 text-surface-500 dark:text-surface-400" />
                    <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200">Notes</h3>
                  </div>
                  <p class="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap">
                    {{ currentSummary.notes || 'No notes yet.' }}
                  </p>
                </div>

                <!-- Quick links -->
                <div class="flex items-center gap-4 pt-1">
                  <NuxtLink
                    :to="`/dashboard/applications/${currentSummary.id}`"
                    class="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
                  >
                    <ExternalLink class="size-3.5" />
                    Full application page
                  </NuxtLink>
                </div>
              </div>

              <!-- DOCUMENTS TAB -->
              <div v-else-if="detailTab === 'documents'" class="space-y-3 max-w-3xl">
                <div v-if="resolvedCurrentApplication?.candidate.documents?.length" class="space-y-2.5">
                  <div
                    v-for="doc in resolvedCurrentApplication.candidate.documents"
                    :key="doc.id"
                    class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-200 bg-white px-4 py-3 dark:border-surface-800 dark:bg-surface-900"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <FileText class="size-4 shrink-0 text-surface-400" />
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-surface-800 dark:text-surface-100 truncate">
                          {{ doc.originalFilename }}
                        </p>
                        <p class="text-xs text-surface-500 dark:text-surface-400">
                          {{ formatDocumentType(doc.type) }} · {{ new Date(doc.createdAt).toLocaleDateString() }}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <a
                        :href="`/api/documents/${doc.id}/preview`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 rounded-md border border-surface-200 px-2.5 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-50 dark:border-surface-600 dark:text-surface-200 dark:hover:bg-surface-800"
                      >
                        <Eye class="size-3.5" />
                        Preview
                      </a>
                      <a
                        :href="`/api/documents/${doc.id}/download`"
                        class="inline-flex items-center gap-1 rounded-md border border-surface-200 px-2.5 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-50 dark:border-surface-600 dark:text-surface-200 dark:hover:bg-surface-800"
                      >
                        <Download class="size-3.5" />
                        Download
                      </a>
                    </div>
                  </div>
                </div>
                <div v-else class="rounded-lg border border-surface-200 bg-white p-8 text-center dark:border-surface-800 dark:bg-surface-900">
                  <FileText class="size-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
                  <p class="text-sm text-surface-500 dark:text-surface-400">No documents uploaded.</p>
                </div>
              </div>

              <!-- RESPONSES TAB -->
              <div v-else-if="detailTab === 'responses'" class="space-y-3 max-w-3xl">
                <div v-if="resolvedCurrentApplication?.responses?.length" class="space-y-2.5">
                  <div
                    v-for="response in resolvedCurrentApplication.responses"
                    :key="response.id"
                    class="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900"
                  >
                    <p class="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                      {{ response.question?.label ?? 'Unknown question' }}
                    </p>
                    <p class="mt-1 text-sm text-surface-700 dark:text-surface-200">
                      {{ formatResponseValue(response.value) }}
                    </p>
                  </div>
                </div>
                <div v-else class="rounded-lg border border-surface-200 bg-white p-8 text-center dark:border-surface-800 dark:bg-surface-900">
                  <FileText class="size-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
                  <p class="text-sm text-surface-500 dark:text-surface-400">No answered questions.</p>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- RIGHT PANEL — Quick overview & actions -->
        <div class="hidden xl:flex w-72 shrink-0 flex-col border-l border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
          <div v-if="currentSummary" class="flex flex-col h-full">
            <!-- Panel header -->
            <div class="shrink-0 border-b border-surface-200 px-4 py-3 dark:border-surface-800">
              <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200">Actions</h3>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-5">
              <!-- Status transitions -->
              <div>
                <p class="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-2">
                  Move to
                </p>
                <div v-if="allowedTransitions.length > 0" class="space-y-1.5">
                  <button
                    v-for="nextStatus in allowedTransitions"
                    :key="nextStatus"
                    :disabled="isMutating"
                    class="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="transitionClasses[nextStatus] ?? 'border border-surface-300 text-surface-600 hover:bg-surface-50'"
                    @click="changeStatus(nextStatus)"
                  >
                    {{ transitionLabels[nextStatus] ?? nextStatus }}
                  </button>
                </div>
                <p v-else class="text-xs text-surface-400 italic">No transitions available.</p>
              </div>

              <!-- Quick info -->
              <div>
                <p class="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-2">
                  Overview
                </p>
                <dl class="space-y-2.5 text-sm">
                  <div class="flex items-center justify-between">
                    <dt class="text-surface-500 dark:text-surface-400">Score</dt>
                    <dd>
                      <span
                        v-if="currentSummary.score != null"
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                        :class="scoreClass(currentSummary.score)"
                      >
                        {{ currentSummary.score }}
                      </span>
                      <span v-else class="text-surface-400">—</span>
                    </dd>
                  </div>
                  <div class="flex items-center justify-between">
                    <dt class="text-surface-500 dark:text-surface-400">Applied</dt>
                    <dd class="text-surface-700 dark:text-surface-200 text-xs">
                      {{ timeAgo(currentSummary.createdAt) }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between">
                    <dt class="text-surface-500 dark:text-surface-400">Documents</dt>
                    <dd class="text-surface-700 dark:text-surface-200 text-xs">
                      {{ resolvedCurrentApplication?.candidate.documents?.length ?? 0 }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between">
                    <dt class="text-surface-500 dark:text-surface-400">Responses</dt>
                    <dd class="text-surface-700 dark:text-surface-200 text-xs">
                      {{ resolvedCurrentApplication?.responses?.length ?? 0 }}
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Navigation -->
              <div>
                <p class="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-2">
                  Navigate
                </p>
                <div class="flex items-center gap-2">
                  <button
                    :disabled="currentIndex === 0"
                    class="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-surface-200 px-2.5 py-1.5 text-xs text-surface-600 transition-colors hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
                    @click="goToPreviousCard"
                  >
                    <ArrowLeft class="size-3.5" />
                    Prev
                  </button>
                  <span class="text-xs text-surface-400 tabular-nums">
                    {{ currentIndex + 1 }}/{{ filteredApplications.length }}
                  </span>
                  <button
                    :disabled="currentIndex >= filteredApplications.length - 1"
                    class="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-surface-200 px-2.5 py-1.5 text-xs text-surface-600 transition-colors hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
                    @click="goToNextCard"
                  >
                    Next
                    <ArrowRight class="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right panel empty state -->
          <div v-else class="flex flex-1 items-center justify-center p-4 text-center">
            <p class="text-sm text-surface-400">Select a candidate to see actions.</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
