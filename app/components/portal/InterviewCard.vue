<script setup lang="ts">
import { Calendar, Clock, MapPin, Video, Phone, Users, Code, FileText } from 'lucide-vue-next'

interface Interview {
  id: string
  title: string
  type: string
  status: string
  scheduledAt: string | Date
  duration: number
  location: string | null
  timezone: string
  candidateResponse: string
}

const props = defineProps<{
  interview: Interview
}>()

function getTypeIcon(type: string) {
  if (type.includes('Video')) return Video
  if (type.includes('Phone')) return Phone
  if (type.includes('Panel')) return Users
  if (type.includes('Technical')) return Code
  if (type.includes('Take-Home')) return FileText
  return Calendar
}

function formatDateTime(date: string | Date, tz: string): string {
  return new Date(date).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz !== 'UTC' ? tz : undefined,
  })
}

const responseLabel = computed(() => {
  const map: Record<string, { text: string; color: string }> = {
    pending: { text: 'Awaiting your response', color: 'text-warning-600 dark:text-warning-400' },
    accepted: { text: 'Accepted', color: 'text-success-600 dark:text-success-400' },
    declined: { text: 'Declined', color: 'text-danger-600 dark:text-danger-400' },
    tentative: { text: 'Tentative', color: 'text-surface-500' },
  }
  return map[props.interview.candidateResponse] ?? { text: props.interview.candidateResponse, color: 'text-surface-500' }
})
</script>

<template>
  <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 sm:p-5 transition-all hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800">
    <div class="flex items-start gap-3">
      <!-- Type icon -->
      <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-500">
        <component :is="getTypeIcon(interview.type)" class="size-5" />
      </div>

      <div class="min-w-0 flex-1">
        <!-- Title & type -->
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
            {{ interview.title }}
          </h3>
          <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
            {{ interview.type }}
          </span>
        </div>

        <!-- Date & time -->
        <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-surface-500 dark:text-surface-400">
          <span class="flex items-center gap-1.5">
            <Calendar class="size-3.5" />
            {{ formatDateTime(interview.scheduledAt, interview.timezone) }}
          </span>
          <span class="flex items-center gap-1.5">
            <Clock class="size-3.5" />
            {{ interview.duration }} min
          </span>
          <span v-if="interview.location" class="flex items-center gap-1.5">
            <MapPin class="size-3.5" />
            {{ interview.location }}
          </span>
        </div>

        <!-- Response status -->
        <div class="mt-2">
          <span class="text-xs font-medium" :class="responseLabel.color">
            {{ responseLabel.text }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
