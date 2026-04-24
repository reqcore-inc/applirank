<script setup lang="ts">
const props = defineProps<{
  status: string
}>()

const statusConfig = computed(() => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    new: {
      label: 'Applied',
      color: 'text-brand-700 dark:text-brand-300',
      bg: 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800',
    },
    screening: {
      label: 'Under Review',
      color: 'text-accent-700 dark:text-accent-300',
      bg: 'bg-accent-50 dark:bg-accent-900/30 border-accent-200 dark:border-accent-800',
    },
    interview: {
      label: 'Interview',
      color: 'text-brand-700 dark:text-brand-300',
      bg: 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800',
    },
    offer: {
      label: 'Offer',
      color: 'text-success-700 dark:text-success-300',
      bg: 'bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-800',
    },
    hired: {
      label: 'Hired',
      color: 'text-success-700 dark:text-success-300',
      bg: 'bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-800',
    },
    rejected: {
      label: 'Not Selected',
      color: 'text-danger-700 dark:text-danger-300',
      bg: 'bg-danger-50 dark:bg-danger-900/30 border-danger-200 dark:border-danger-800',
    },
  }
  return map[props.status] ?? { label: props.status, color: 'text-surface-600', bg: 'bg-surface-100 border-surface-200' }
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
    :class="[statusConfig.color, statusConfig.bg]"
  >
    {{ statusConfig.label }}
  </span>
</template>
