<script setup lang="ts">
import { Users, Plus, Search, Mail, Phone, ArrowUp, ArrowDown, ArrowUpDown, SlidersHorizontal, X, StickyNote, Maximize2, Minimize2, Check } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Candidates â€” WWMate',
  description: 'Manage your candidate pool',
})

// â”€â”€ Column visibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const COLUMNS_STORAGE_KEY = 'WWMate:columns:candidates'

const defaultColumnVisibility = {
  email: true,
  phone: true,
  applications: true,
  added: true,
  quickNotes: true,
}

const visibleColumns = ref<Record<string, boolean>>({ ...defaultColumnVisibility })

const { definitions: propertyDefs } = useProperties({ entityType: () => 'candidate' })

const candidateColumns = computed(() => [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'applications', label: 'Applications' },
  { key: 'added', label: 'Added' },
  { key: 'quickNotes', label: 'Quick notes' },
  ...propertyDefs.value.map((d) => ({ key: `prop_${d.id}`, label: d.name })),
])

onMounted(() => {
  try {
    const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY)
    if (raw) visibleColumns.value = { ...defaultColumnVisibility, ...JSON.parse(raw) }
  } catch {}
})

watch(visibleColumns, (val) => {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(val)) } catch {}
}, { deep: true })

const searchInput = ref('')
const debouncedSearch = ref<string | undefined>(undefined)

let debounceTimer: ReturnType<typeof setTimeout>
watch(searchInput, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = val.trim() || undefined
  }, 300)
})

// â”€â”€ Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const drawerOpen = ref(false)
const isFullscreen = ref(false)
const filterGender = ref<string | undefined>(undefined)
const filterDobFrom = ref<string | undefined>(undefined)
const filterDobTo = ref<string | undefined>(undefined)
const propertyFilters = ref<import('~~/shared/properties').PropertyFilter[]>([])

const activeFilterCount = computed(() =>
  [filterGender.value, filterDobFrom.value, filterDobTo.value].filter(Boolean).length
  + propertyFilters.value.length
)

function clearFilters() {
  filterGender.value = undefined
  filterDobFrom.value = undefined
  filterDobTo.value = undefined
  propertyFilters.value = []
}

const { candidates, total, fetchStatus, error, refresh } = useCandidates({
  search: debouncedSearch,
  gender: filterGender,
  dobFrom: filterDobFrom,
  dobTo: filterDobTo,
  propertyFilters,
})

// Org localization (name + date format)
const { formatCandidateName, formatDateTime } = useOrgSettings()

// â”€â”€ Sorting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Quick notes inline editing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Property value lookup helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Avoids `as any` in the template and is null-safe.
function getPropertyValue(entity: { properties?: import('~~/shared/properties').PropertyEntry[] | null }, definitionId: string): unknown {
  return entity.properties?.find((p) => p.definition.id === definitionId)?.value ?? null
}

// â”€â”€ Saved Views â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type CandidatesViewSettings = {
  gender?: string
  dobFrom?: string
  dobTo?: string
  propertyFilters: import('~~/shared/properties').PropertyFilter[]
  sortKey: SortKey
  sortDir: SortDir
  visibleColumns?: Record<string, boolean>
}

const defaultSettings: CandidatesViewSettings = {
  gender: undefined,
  dobFrom: undefined,
  dobTo: undefined,
  propertyFilters: [],
  sortKey: 'created',
  sortDir: 'desc',
  visibleColumns: undefined,
}

const currentSettings = computed<CandidatesViewSettings>(() => ({
  gender: filterGender.value,
  dobFrom: filterDobFrom.value,
  dobTo: filterDobTo.value,
  propertyFilters: [...propertyFilters.value],
  sortKey: sortKey.value,
  sortDir: sortDir.value,
  visibleColumns: { ...visibleColumns.value },
}))

function applySettings(s: CandidatesViewSettings) {
  filterGender.value = s.gender
  filterDobFrom.value = s.dobFrom
  filterDobTo.value = s.dobTo
  propertyFilters.value = [...(s.propertyFilters ?? [])]
  sortKey.value = s.sortKey
  sortDir.value = s.sortDir
  if (s.visibleColumns) visibleColumns.value = { ...defaultColumnVisibility, ...s.visibleColumns }
}

const {
  views,
  activeViewId,
  applyView,
  saveView,
  updateView,
  deleteView,
  setDefault,
  clearActive,
} = useSavedViews<CandidatesViewSettings>('candidates', defaultSettings)

onMounted(() => {
  nextTick(() => {
    if (activeViewId.value) {
      const s = applyView(activeViewId.value)
      if (s) applySettings(s)
    }
  })
})

function settingsEqual(a: CandidatesViewSettings, b: CandidatesViewSettings) {
  return a.gender === b.gender
    && a.dobFrom === b.dobFrom
    && a.dobTo === b.dobTo
    && a.sortKey === b.sortKey
    && a.sortDir === b.sortDir
    && JSON.stringify(a.propertyFilters ?? []) === JSON.stringify(b.propertyFilters ?? [])
    && JSON.stringify(a.visibleColumns ?? {}) === JSON.stringify(b.visibleColumns ?? {})
}

const isDirty = computed(() => {
  const view = views.value.find(v => v.id === activeViewId.value)
  if (!view) return false
  return !settingsEqual(currentSettings.value, { ...defaultSettings, ...view.settings })
})

function onSelectView(id: string | null) {
  if (id == null) {
    clearActive()
    applySettings(defaultSettings)
    return
  }
  const s = applyView(id)
  if (s) applySettings(s)
}

function onSaveView(name: string) {
  saveView(name, currentSettings.value)
}

function onUpdateView(id: string) {
  updateView(id, { settings: currentSettings.value })
}

// â”€â”€ Candidate detail drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const selectedCandidateId = ref<string | null>(null)
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

    <!-- Search + Views + Filters -->
    <div class="flex items-center gap-2 mb-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-surface-400" />
        <input
          v-model="searchInput"
          type="text"
          placeholder="Search by name or emailâ€¦"
          class="w-full rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 pl-10 pr-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
        />
      </div>
      <SavedViewsMenu
        :views="views"
        :active-view-id="activeViewId"
        :is-dirty="isDirty"
        @select="onSelectView"
        @save="onSaveView"
        @update="onUpdateView"
        @delete="deleteView"
        @set-default="setDefault"
      />
      <ColumnsMenu
        v-model="visibleColumns"
        :columns="candidateColumns"
      />
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
        :class="activeFilterCount > 0
          ? 'border-surface-400 bg-surface-100 text-surface-800 dark:border-surface-500 dark:bg-surface-800 dark:text-surface-200'
          : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'"
        @click="drawerOpen = true"
      >
        <SlidersHorizontal class="size-4" />
        Filters
        <span
          v-if="activeFilterCount > 0"
          class="inline-flex items-center justify-center size-4 rounded-full bg-surface-700 dark:bg-surface-300 text-white dark:text-surface-900 text-xs font-semibold"
        >{{ activeFilterCount }}</span>
      </button>
      <button
        v-if="activeFilterCount > 0"
        class="inline-flex items-center gap-1 text-xs text-surface-400 hover:text-danger-600 transition-colors"
        @click="clearFilters"
      >
        <X class="size-3" />
        Clear
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-2.5 py-2 text-surface-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
        :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen table'"
        @click="isFullscreen = !isFullscreen"
      >
        <Maximize2 v-if="!isFullscreen" class="size-4" />
        <Minimize2 v-else class="size-4" />
      </button>
    </div>

    <!-- Filter drawer -->
    <FilterDrawer
      v-model="drawerOpen"
      title="Filter candidates"
      description="Customize your view, then save it for quick access."
      :active-count="activeFilterCount"
      saveable
      :default-save-name="`View ${views.length + 1}`"
      @reset="applySettings(defaultSettings)"
      @save-view="onSaveView"
    >
      <div class="space-y-6">
        <!-- Gender -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400 mb-2">Gender</label>
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

        <!-- Date of birth range -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400 mb-2">Date of birth</label>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <span class="block text-[11px] text-surface-500 mb-1">From</span>
              <input
                v-model="filterDobFrom"
                type="date"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <span class="block text-[11px] text-surface-500 mb-1">To</span>
              <input
                v-model="filterDobTo"
                type="date"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <!-- Sort -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400 mb-2">Sort by</label>
          <div class="flex gap-2">
            <select
              v-model="sortKey"
              class="flex-1 rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            >
              <option value="created">Date added</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="applications">Applications</option>
            </select>
            <select
              v-model="sortDir"
              class="w-32 rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        <!-- Property filters -->
        <div v-if="propertyDefs.length > 0">
          <label class="block text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400 mb-2">Properties</label>
          <PropertyFilterBar v-model="propertyFilters" entity-type="candidate" />
        </div>

        <!-- Columns -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400 mb-2">Columns</label>
          <div class="space-y-1.5">
            <label
              v-for="col in candidateColumns.filter(c => !c.required)"
              :key="col.key"
              class="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <span
                class="flex size-4 shrink-0 items-center justify-center rounded border transition-colors"
                :class="visibleColumns[col.key] ? 'bg-brand-600 border-brand-600 text-white' : 'border-surface-300 dark:border-surface-600'"
                @click="visibleColumns = { ...visibleColumns, [col.key]: !visibleColumns[col.key] }"
              >
                <Check v-if="visibleColumns[col.key]" class="size-3" />
              </span>
              <span class="text-sm text-surface-700 dark:text-surface-300 group-hover:text-surface-900 dark:group-hover:text-surface-100 transition-colors">{{ col.label }}</span>
            </label>
          </div>
        </div>
      </div>
    </FilterDrawer>

    <!-- Loading state -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-12 text-surface-400">
      Loading candidatesâ€¦
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
      <Teleport to="body" :disabled="!isFullscreen">
        <div :class="isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-surface-950 flex flex-col' : ''">
          <!-- Fullscreen header -->
          <div v-if="isFullscreen" class="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-800 shrink-0 bg-white dark:bg-surface-950">
            <span class="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Candidates â€” {{ sortedCandidates.length }} result{{ sortedCandidates.length === 1 ? '' : 's' }}
            </span>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 dark:border-surface-800 px-2.5 py-1.5 text-sm text-surface-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
              @click="isFullscreen = false"
            >
              <Minimize2 class="size-4" />
              Exit fullscreen
            </button>
          </div>
          <div :class="isFullscreen ? 'flex-1 overflow-auto p-4' : ''">
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
              <th v-if="visibleColumns.email" class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">
                <button class="inline-flex items-center gap-1 hover:text-surface-900 dark:hover:text-surface-100 transition-colors" @click="toggleSort('email')">
                  Email
                  <ArrowUp v-if="sortKey === 'email' && sortDir === 'asc'" class="size-3.5" />
                  <ArrowDown v-else-if="sortKey === 'email' && sortDir === 'desc'" class="size-3.5" />
                  <ArrowUpDown v-else class="size-3.5 opacity-40" />
                </button>
              </th>
              <th v-if="visibleColumns.phone" class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden md:table-cell">
                <button class="inline-flex items-center gap-1 hover:text-surface-900 dark:hover:text-surface-100 transition-colors" @click="toggleSort('phone')">
                  Phone
                  <ArrowUp v-if="sortKey === 'phone' && sortDir === 'asc'" class="size-3.5" />
                  <ArrowDown v-else-if="sortKey === 'phone' && sortDir === 'desc'" class="size-3.5" />
                  <ArrowUpDown v-else class="size-3.5 opacity-40" />
                </button>
              </th>
              <th v-if="visibleColumns.applications" class="text-center px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden sm:table-cell">
                <button class="inline-flex items-center gap-1 hover:text-surface-900 dark:hover:text-surface-100 transition-colors" @click="toggleSort('applications')">
                  Applications
                  <ArrowUp v-if="sortKey === 'applications' && sortDir === 'asc'" class="size-3.5" />
                  <ArrowDown v-else-if="sortKey === 'applications' && sortDir === 'desc'" class="size-3.5" />
                  <ArrowUpDown v-else class="size-3.5 opacity-40" />
                </button>
              </th>
              <th v-if="visibleColumns.added" class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">
                <button class="inline-flex items-center gap-1 hover:text-surface-900 dark:hover:text-surface-100 transition-colors" @click="toggleSort('created')">
                  Added
                  <ArrowUp v-if="sortKey === 'created' && sortDir === 'asc'" class="size-3.5" />
                  <ArrowDown v-else-if="sortKey === 'created' && sortDir === 'desc'" class="size-3.5" />
                  <ArrowUpDown v-else class="size-3.5 opacity-40" />
                </button>
              </th>
              <th v-if="visibleColumns.quickNotes" class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden lg:table-cell w-52">
                Quick notes
              </th>
              <template v-for="d in propertyDefs" :key="d.id">
                <th v-if="visibleColumns[`prop_${d.id}`]" class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400 whitespace-nowrap">
                  {{ d.name }}
                </th>
              </template>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
            <tr
              v-for="c in sortedCandidates"
              :key="c.id"
              class="group bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors cursor-pointer [&>td]:align-top"
              @click="selectedCandidateId = c.id"
            >
              <td class="px-4 py-3">
                <button
                  type="button"
                  class="font-semibold text-surface-900 dark:text-surface-100 group-hover:text-brand-600 transition-colors whitespace-nowrap text-left"
                  @click.stop="selectedCandidateId = c.id"
                >
                  {{ formatCandidateName(c) }}
                </button>
              </td>
              <td v-if="visibleColumns.email" class="px-4 py-3 text-surface-500 dark:text-surface-400">
                <a
                  :href="`mailto:${c.email}`"
                  class="inline-flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 hover:underline transition-colors"
                  @click.stop
                >
                  <Mail class="size-3.5 shrink-0" />
                  <span class="truncate max-w-[200px]">{{ c.email }}</span>
                </a>
              </td>
              <td v-if="visibleColumns.phone" class="px-4 py-3 text-surface-500 dark:text-surface-400 hidden md:table-cell">
                <span v-if="c.phone" class="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Phone class="size-3.5 shrink-0" />
                  {{ c.phone }}
                </span>
                <span v-else class="text-surface-300 dark:text-surface-600">â€”</span>
              </td>
              <td v-if="visibleColumns.applications" class="px-4 py-3 text-center hidden sm:table-cell">
                <span
                  v-if="c.applicationCount > 0"
                  class="inline-flex items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-400 tabular-nums"
                >
                  {{ c.applicationCount }}
                </span>
                <span v-else class="text-surface-300 dark:text-surface-600">0</span>
              </td>
              <td v-if="visibleColumns.added" class="px-4 py-3 text-surface-500 dark:text-surface-400 whitespace-nowrap">
                <TimelineDateLink :date="c.createdAt">{{ formatDateTime(c.createdAt) }}</TimelineDateLink>
              </td>
              <!-- Quick notes â€” inline editable (must match header order) -->
              <td v-if="visibleColumns.quickNotes" class="px-4 py-3 hidden lg:table-cell w-52 align-top" @click.stop>
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
                  <span v-else class="text-xs text-surface-300 dark:text-surface-600 group-hover/notes:text-surface-400 transition-colors italic">Add noteâ€¦</span>
                </button>
              </td>
              <!-- Property columns (must come AFTER quick notes to match header order) -->
              <template v-for="d in propertyDefs" :key="d.id">
                <td v-if="visibleColumns[`prop_${d.id}`]" class="px-4 py-3 text-surface-500 dark:text-surface-400 align-top">
                  <PropertyTableCell
                    entity-type="candidate"
                    :entity-id="c.id"
                    :definition="d"
                    :value="getPropertyValue(c, d.id)"
                  />
                </td>
              </template>
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
      </Teleport>
    </div>
  </div>

  <!-- Candidate detail drawer -->
  <CandidateDetailDrawer
    v-if="selectedCandidateId"
    :candidate-id="selectedCandidateId"
    @close="selectedCandidateId = null"
  />
</template>

