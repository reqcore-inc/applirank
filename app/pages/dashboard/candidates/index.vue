<script setup lang="ts">
import { Users, Plus, Search, Mail, Phone } from 'lucide-vue-next'

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

const { candidates, total, fetchStatus, error, refresh } = useCandidates({
  search: debouncedSearch,
})
</script>

<template>
  <div class="mx-auto max-w-4xl">
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

    <!-- Search -->
    <div class="relative mb-6">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-surface-400" />
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search by name or email…"
        class="w-full rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 pl-10 pr-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
      />
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

    <!-- Candidate list -->
    <div v-else class="space-y-2">
      <NuxtLink
        v-for="c in candidates"
        :key="c.id"
        :to="$localePath(`/dashboard/candidates/${c.id}`)"
        class="flex items-center justify-between rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 py-3 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm transition-all group"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100 group-hover:text-brand-600 transition-colors truncate">
              {{ c.firstName }} {{ c.lastName }}
            </h3>
            <span
              v-if="c.applicationCount > 0"
              class="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-950 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-400 shrink-0"
            >
              {{ c.applicationCount }} application{{ c.applicationCount === 1 ? '' : 's' }}
            </span>
          </div>
          <div class="flex items-center gap-3 text-xs text-surface-400">
            <a
              :href="`mailto:${c.email}`"
              target="_blank"
              class="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 hover:underline cursor-pointer transition-colors"
            >
              <Mail class="size-3" />
              {{ c.email }}
            </a>
            <span v-if="c.phone" class="inline-flex items-center gap-1">
              <Phone class="size-3" />
              {{ c.phone }}
            </span>
            <span>{{ new Date(c.createdAt).toLocaleDateString() }}</span>
          </div>
        </div>
      </NuxtLink>

      <!-- Total count -->
      <p class="text-xs text-surface-400 pt-2">
        {{ total }} candidate{{ total === 1 ? '' : 's' }} total
      </p>
    </div>
  </div>
</template>
