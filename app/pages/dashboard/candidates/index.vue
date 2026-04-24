<script setup lang="ts">
import { Users, Plus, Search, Mail, Phone, ArrowUp, ArrowDown, ArrowUpDown, SlidersHorizontal, X, StickyNote } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Candidates — Reqcore',
  description: 'Manage your candidate pool',
})

const searchInput = ref('')
const debouncedSearch = ref<string | undefined>(undefined)

let debounceTimer: ReturnType<typeof setTimeout>
watch(searchInput, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = val.trim() || undefined
  }, 300)
})

// ── Filters ───────────────────────────────────────────────────────────────────

const showFilters = ref(false)
const filterGender = ref<string | undefined>(undefined)
const filterDobFrom = ref<string | undefined>(undefined)
const filterDobTo = ref<string | undefined>(undefined)

const activeFilterCount = computed(() =>
  [filterGender.value, filterDobFrom.value, filterDobTo.value].filter(Boolean).length
)

function clearFilters() {
  filterGender.value = undefined
  filterDobFrom.value = undefined
  filterDobTo.value = undefined
}

const { candidates, total, fetchStatus, error, refresh } = useCandidates({
  search: debouncedSearch,
  gender: filterGender,
  dobFrom: filterDobFrom,
  dobTo: filterDobTo,
})

// Org localization (name + date format)
const { formatCandidateName, formatDateTime } = useOrgSettings()

// ── Sorting ───────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'email' | 'phone' | 'applications' | 'created'
type SortDir = 'asc' | 'desc'

const sortKey = ref<SortKey>('created')
const sortDir = ref<SortDir>('desc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'created' || key === 'applications' ? 'desc' : 'asc'
  }
}

const sortedCandidates = computed(() => {
  const list = [...candidates.value]
  const dir = sortDir.value === 'asc' ? 1 : -1

  list.sort((a, b) => {
    switch (sortKey.value) {
      case 'name':
        return dir * formatCandidateName(a).localeCompare(formatCandidateName(b))
      case 'email':
        return dir * a.email.localeCompare(b.email)
      case 'phone':
        return dir * (a.phone ?? '').localeCompare(b.phone ?? '')
      case 'applications':
        return dir * ((a.applicationCount ?? 0) - (b.applicationCount ?? 0))
      case 'created':
        return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      default:
        return 0
    }
  })

  return list
})

// ── Quick notes inline editing ────────────────────────────────────────────────

const editingNotesId = ref<string | null>(null)
const editingNotesValue = ref('')
const isSavingNotes = ref(false)

function startEditNotes(candidateId: string, currentNotes: string | null) {
  editingNotesId.value = candidateId
  editingNotesValue.value = currentNotes ?? ''
}

async function saveNotes(candidateId: string) {
  isSavingNotes.value = true
  try {
    await $fetch(`/api/candidates/${candidateId}`, {
      method: 'PATCH',
      body: { quickNotes: editingNotesValue.value || null },
    })
    await refresh()
  } finally {
    isSavingNotes.value = false
    editingNotesId.value = null
  }
}

function cancelEditNotes() {
  editingNotesId.value = null
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Candidates</h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Manage your candidate pool and track applicants.
        </p>
      </div>
      <NuxtLink
        :to="$localePath('/dashboard/candidates/new')"
        class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        <Plus class="size-4" />
        Add Candidate
      </NuxtLink>
    </div>

    <!-- Search + filter row -->
    <div class="flex items-center gap-2 mb-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-surface-400" />
        <input
          v-model="searchInput"
          type="text"
          placeholder="Search by name or email…"
          class="w-full rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 pl-10 pr-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
        />
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
        :class="showFilters || activeFilterCount > 0
          ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300'
          : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'"
        @click="showFilters = !showFilters"
      >
        <SlidersHorizontal class="size-4" />
        Filters
        <span
          v-if="activeFilterCount > 0"
          class="inline-flex items-center justify-center size-4 rounded-full bg-brand-600 text-white text-xs font-semibold"
        >{{ activeFilterCount }}</span>
      </button>
    </div>

    <!-- Filter panel -->
    <div
      v-if="showFilters"
      class="rounded-lg border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      <!-- Gender -->
      <div>
        <label class="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">Gender</label>
        <select
          v-model="filterGender"
          class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
        >
          <option :value="undefined">Any</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </div>
      <!-- Date of birth — from -->
      <div>
        <label class="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">Date of birth — from</label>
        <input
          v-model="filterDobFrom"
          type="date"
          class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
        />
      </div>
      <!-- Date of birth — to -->
      <div>
        <label class="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">Date of birth — to</label>
        <div class="flex items-center gap-2">
          <input
            v-model="filterDobTo"
            type="date"
            class="flex-1 rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          />
          <button
            v-if="activeFilterCount > 0"
            type="button"
            class="text-xs text-surface-400 hover:text-danger-500 dark:hover:text-danger-400 transition-colors underline shrink-0"
            @click="clearFilters"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-12 text-surface-400">
      Loading candidates…
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
    >
      Failed to load candidates. Please try again.
      <button class="underline ml-1" @click="refresh()">Retry</button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="candidates.length === 0"
      class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-12 text-center"
    >
      <Users class="size-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-surface-700 dark:text-surface-200 mb-1">
        {{ debouncedSearch ? 'No candidates found' : 'No candidates yet' }}
      </h3>
      <p class="text-sm text-surface-500 dark:text-surface-400 mb-4">
        {{ debouncedSearch
          ? 'Try adjusting your search terms.'
          : 'Add your first candidate to start building your talent pool.'
        }}
      </p>
      <NuxtLink
        v-if="!debouncedSearch"
        :to="$localePath('/dashboard/candidates/new')"
        class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        <Plus class="size-4" />
        Add Candidate
      </NuxtLink>
    </div>

    <!-- Candidate table -->
    <div v-else>
      <div class="overflow-x-auto rounded-lg border border-surface-200 dark:border-surface-800">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800">
              <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">
                <button class="inline-flex items-center gap-1 hover:text-surface-900 dark:hover:text-surface-100 transition-colors" @click="toggleSort('name')">
                  Name
                  <ArrowUp v-if="sortKey === 'name' && sortDir === 'asc'" class="size-3.5" />
                  <ArrowDown v-else-if="sortKey === 'name' && sortDir === 'desc'" class="size-3.5" />
                  <ArrowUpDown v-else class="size-3.5 opacity-40" />
                </button>
              </th>
              <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">
                <button class="inline-flex items-center gap-1 hover:text-surface-900 dark:hover:text-surface-100 transition-colors" @click="toggleSort('email')">
                  Email
                  <ArrowUp v-if="sortKey === 'email' && sortDir === 'asc'" class="size-3.5" />
                  <ArrowDown v-else-if="sortKey === 'email' && sortDir === 'desc'" class="size-3.5" />
                  <ArrowUpDown v-else class="size-3.5 opacity-40" />
                </button>
              </th>
              <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden md:table-cell">
                <button class="inline-flex items-center gap-1 hover:text-surface-900 dark:hover:text-surface-100 transition-colors" @click="toggleSort('phone')">
                  Phone
                  <ArrowUp v-if="sortKey === 'phone' && sortDir === 'asc'" class="size-3.5" />
                  <ArrowDown v-else-if="sortKey === 'phone' && sortDir === 'desc'" class="size-3.5" />
                  <ArrowUpDown v-else class="size-3.5 opacity-40" />
                </button>
              </th>
              <th class="text-center px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden sm:table-cell">
                <button class="inline-flex items-center gap-1 hover:text-surface-900 dark:hover:text-surface-100 transition-colors" @click="toggleSort('applications')">
                  Applications
                  <ArrowUp v-if="sortKey === 'applications' && sortDir === 'asc'" class="size-3.5" />
                  <ArrowDown v-else-if="sortKey === 'applications' && sortDir === 'desc'" class="size-3.5" />
                  <ArrowUpDown v-else class="size-3.5 opacity-40" />
                </button>
              </th>
              <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">
                <button class="inline-flex items-center gap-1 hover:text-surface-900 dark:hover:text-surface-100 transition-colors" @click="toggleSort('created')">
                  Added
                  <ArrowUp v-if="sortKey === 'created' && sortDir === 'asc'" class="size-3.5" />
                  <ArrowDown v-else-if="sortKey === 'created' && sortDir === 'desc'" class="size-3.5" />
                  <ArrowUpDown v-else class="size-3.5 opacity-40" />
                </button>
              </th>
              <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden lg:table-cell w-52">
                Quick notes
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
            <tr
              v-for="c in sortedCandidates"
              :key="c.id"
              class="group bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors cursor-pointer"
              @click="$router.push($localePath(`/dashboard/candidates/${c.id}`))"
            >
              <td class="px-4 py-3">
                <NuxtLink
                  :to="$localePath(`/dashboard/candidates/${c.id}`)"
                  class="font-semibold text-surface-900 dark:text-surface-100 group-hover:text-brand-600 transition-colors whitespace-nowrap"
                >
                  {{ formatCandidateName(c) }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 text-surface-500 dark:text-surface-400">
                <a
                  :href="`mailto:${c.email}`"
                  class="inline-flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 hover:underline transition-colors"
                  @click.stop
                >
                  <Mail class="size-3.5 shrink-0" />
                  <span class="truncate max-w-[200px]">{{ c.email }}</span>
                </a>
              </td>
              <td class="px-4 py-3 text-surface-500 dark:text-surface-400 hidden md:table-cell">
                <span v-if="c.phone" class="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Phone class="size-3.5 shrink-0" />
                  {{ c.phone }}
                </span>
                <span v-else class="text-surface-300 dark:text-surface-600">—</span>
              </td>
              <td class="px-4 py-3 text-center hidden sm:table-cell">
                <span
                  v-if="c.applicationCount > 0"
                  class="inline-flex items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-400 tabular-nums"
                >
                  {{ c.applicationCount }}
                </span>
                <span v-else class="text-surface-300 dark:text-surface-600">0</span>
              </td>
              <td class="px-4 py-3 text-surface-500 dark:text-surface-400 whitespace-nowrap">
                <TimelineDateLink :date="c.createdAt">{{ formatDateTime(c.createdAt) }}</TimelineDateLink>
              </td>
              <!-- Quick notes — inline editable -->
              <td class="px-4 py-3 hidden lg:table-cell" @click.stop>
                <div v-if="editingNotesId === c.id" class="flex items-start gap-1.5">
                  <textarea
                    v-model="editingNotesValue"
                    rows="2"
                    maxlength="1000"
                    autofocus
                    class="flex-1 rounded border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 px-2 py-1 text-xs text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    @keydown.enter.exact.prevent="saveNotes(c.id)"
                    @keydown.escape="cancelEditNotes"
                  />
                  <div class="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      :disabled="isSavingNotes"
                      class="rounded bg-brand-600 px-2 py-0.5 text-xs text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                      @click="saveNotes(c.id)"
                    >Save</button>
                    <button
                      type="button"
                      class="rounded border border-surface-300 dark:border-surface-700 px-2 py-0.5 text-xs text-surface-500 hover:text-surface-700 transition-colors"
                      @click="cancelEditNotes"
                    >Cancel</button>
                  </div>
                </div>
                <button
                  v-else
                  type="button"
                  class="group/notes flex items-start gap-1 text-left w-full min-h-[1.5rem]"
                  @click="startEditNotes(c.id, c.quickNotes ?? null)"
                >
                  <StickyNote class="size-3.5 shrink-0 mt-0.5 text-surface-300 dark:text-surface-600 group-hover/notes:text-brand-500 transition-colors" />
                  <span
                    v-if="c.quickNotes"
                    class="text-xs text-surface-600 dark:text-surface-400 line-clamp-2 group-hover/notes:text-surface-900 dark:group-hover/notes:text-surface-100 transition-colors"
                  >{{ c.quickNotes }}</span>
                  <span v-else class="text-xs text-surface-300 dark:text-surface-600 group-hover/notes:text-surface-400 transition-colors italic">Add note…</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Total count -->
      <p class="text-xs text-surface-400 pt-3">
        {{ total }} candidate{{ total === 1 ? '' : 's' }} total
      </p>
    </div>
  </div>
</template>
