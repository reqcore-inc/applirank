<script setup lang="ts">
import {
  FileText,
  GitCommitHorizontal,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Star,
  UserCheck,
  Eye,
} from 'lucide-vue-next'

interface TimelineEntry {
  id: string
  type: 'status_change' | 'interview'
  title: string
  description: string
  date: string | Date
}

const props = defineProps<{
  entries: TimelineEntry[]
}>()

function getIcon(entry: TimelineEntry) {
  if (entry.type === 'interview') return Calendar
  if (entry.title.includes('Hired')) return Star
  if (entry.title.includes('Not Moving')) return XCircle
  if (entry.title.includes('Offer')) return UserCheck
  if (entry.title.includes('Viewed')) return Eye
  if (entry.title.includes('Submitted')) return FileText
  return ArrowRight
}

function getIconColor(entry: TimelineEntry) {
  if (entry.title.includes('Hired')) return 'text-success-500 bg-success-50 dark:bg-success-900/30'
  if (entry.title.includes('Not Moving')) return 'text-danger-500 bg-danger-50 dark:bg-danger-900/30'
  if (entry.title.includes('Offer')) return 'text-accent-500 bg-accent-50 dark:bg-accent-900/30'
  if (entry.title.includes('Viewed')) return 'text-success-500 bg-success-50 dark:bg-success-900/30'
  if (entry.type === 'interview') return 'text-brand-500 bg-brand-50 dark:bg-brand-900/30'
  return 'text-surface-500 bg-surface-100 dark:bg-surface-800'
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="flow-root">
    <ul class="-mb-8">
      <li v-for="(entry, index) in entries" :key="entry.id" class="relative pb-8">
        <!-- Connector line -->
        <span
          v-if="index < entries.length - 1"
          class="absolute left-4 top-8 -ml-px h-full w-0.5 bg-surface-200 dark:bg-surface-700"
        />

        <div class="relative flex items-start gap-3">
          <!-- Icon -->
          <div
            class="relative flex size-8 shrink-0 items-center justify-center rounded-full"
            :class="getIconColor(entry)"
          >
            <component :is="getIcon(entry)" class="size-4" />
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-medium text-surface-900 dark:text-surface-100">
                {{ entry.title }}
              </p>
              <time
                class="shrink-0 text-xs text-surface-400 dark:text-surface-500 tabular-nums"
                :title="formatDateTime(entry.date)"
              >
                {{ formatDate(entry.date) }} at {{ formatTime(entry.date) }}
              </time>
            </div>
            <p class="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
              {{ entry.description }}
            </p>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
