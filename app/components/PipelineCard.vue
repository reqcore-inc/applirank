<script setup lang="ts">
import { User, Calendar } from 'lucide-vue-next'

const props = defineProps<{
  id: string
  candidateFirstName: string
  candidateLastName: string
  candidateEmail: string
  createdAt: string
  score: number | null
  allowedTransitions: string[]
  isTransitioning: boolean
}>()

const emit = defineEmits<{
  (e: 'transition', status: string): void
}>()

const transitionLabels: Record<string, string> = {
  new: 'Re-open',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Reject',
}

const transitionClasses: Record<string, string> = {
  new: 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700',
  screening: 'text-info-600 dark:text-info-400 hover:bg-info-50 dark:hover:bg-info-950',
  interview: 'text-warning-600 dark:text-warning-400 hover:bg-warning-50 dark:hover:bg-warning-950',
  offer: 'text-success-600 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-950',
  hired: 'text-success-700 dark:text-success-300 hover:bg-success-100 dark:hover:bg-success-900',
  rejected: 'text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950',
}
</script>

<template>
  <div class="rounded-xl border border-surface-200/80 dark:border-surface-800/60 bg-white dark:bg-surface-900 p-3 shadow-sm shadow-surface-900/[0.03] dark:shadow-none">
    <NuxtLink
      :to="$localePath(`/dashboard/applications/${id}`)"
      class="block mb-2 group"
    >
      <h4 class="text-sm font-semibold text-surface-900 dark:text-surface-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
        {{ candidateFirstName }} {{ candidateLastName }}
      </h4>
      <div class="flex items-center gap-2 text-xs text-surface-400 mt-0.5">
        <a
          :href="`mailto:${candidateEmail}`"
          target="_blank"
          class="inline-flex items-center gap-1 truncate hover:text-brand-600 dark:hover:text-brand-400 hover:underline cursor-pointer transition-colors"
          @click.stop
        >
          <User class="size-3 shrink-0" />
          {{ candidateEmail }}
        </a>
      </div>
    </NuxtLink>

    <div class="flex items-center justify-between text-xs text-surface-400">
      <span class="inline-flex items-center gap-1">
        <Calendar class="size-3" />
        {{ new Date(createdAt).toLocaleDateString() }}
      </span>
      <span v-if="score != null" class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset"
        :class="score >= 75
          ? 'bg-success-50 text-success-700 ring-success-200 dark:bg-success-950 dark:text-success-300 dark:ring-success-800'
          : score >= 40
            ? 'bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-950 dark:text-warning-300 dark:ring-warning-800'
            : 'bg-danger-50 text-danger-700 ring-danger-200 dark:bg-danger-950 dark:text-danger-300 dark:ring-danger-800'"
      >
        {{ score }}pts
      </span>
    </div>

    <!-- Transition buttons -->
    <div v-if="allowedTransitions.length > 0" class="flex flex-wrap gap-1 mt-2 pt-2 border-t border-surface-100 dark:border-surface-800/60">
      <button
        v-for="nextStatus in allowedTransitions"
        :key="nextStatus"
        :disabled="isTransitioning"
        class="rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50"
        :class="transitionClasses[nextStatus] ?? 'text-surface-500 hover:bg-surface-100'"
        @click.prevent="emit('transition', nextStatus)"
      >
        {{ transitionLabels[nextStatus] ?? nextStatus }}
      </button>
    </div>
  </div>
</template>
