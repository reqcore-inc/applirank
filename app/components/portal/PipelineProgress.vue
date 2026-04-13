<script setup lang="ts">
import { CheckCircle, Circle, Clock, XCircle } from 'lucide-vue-next'

interface PipelineStage {
  key: string
  label: string
  description: string
  status: 'completed' | 'current' | 'upcoming' | 'inactive'
}

const props = defineProps<{
  stages: PipelineStage[]
  isRejected: boolean
}>()

function getStageIcon(status: string) {
  switch (status) {
    case 'completed': return CheckCircle
    case 'current': return Clock
    default: return Circle
  }
}

/** Stage-specific colors matching the pipeline status badge palette. */
function getStageColor(key: string) {
  const map: Record<string, {
    node: string
    current: string
    line: string
    label: string
    currentLabel: string
    pulse: string
  }> = {
    new: {
      node: 'bg-brand-500 text-white shadow-sm shadow-brand-500/25',
      current: 'bg-brand-500 text-white shadow-md shadow-brand-500/40 ring-4 ring-brand-100 dark:ring-brand-900/50',
      line: 'bg-brand-500',
      label: 'text-brand-700 dark:text-brand-300',
      currentLabel: 'text-brand-600 dark:text-brand-400',
      pulse: 'bg-brand-500/40',
    },
    screening: {
      node: 'bg-accent-500 text-white shadow-sm shadow-accent-500/25',
      current: 'bg-accent-500 text-white shadow-md shadow-accent-500/40 ring-4 ring-accent-100 dark:ring-accent-900/50',
      line: 'bg-accent-500',
      label: 'text-accent-700 dark:text-accent-300',
      currentLabel: 'text-accent-600 dark:text-accent-400',
      pulse: 'bg-accent-500/40',
    },
    interview: {
      node: 'bg-brand-500 text-white shadow-sm shadow-brand-500/25',
      current: 'bg-brand-500 text-white shadow-md shadow-brand-500/40 ring-4 ring-brand-100 dark:ring-brand-900/50',
      line: 'bg-brand-500',
      label: 'text-brand-700 dark:text-brand-300',
      currentLabel: 'text-brand-600 dark:text-brand-400',
      pulse: 'bg-brand-500/40',
    },
    offer: {
      node: 'bg-success-500 text-white shadow-sm shadow-success-500/25',
      current: 'bg-success-500 text-white shadow-md shadow-success-500/40 ring-4 ring-success-100 dark:ring-success-900/50',
      line: 'bg-success-500',
      label: 'text-success-700 dark:text-success-300',
      currentLabel: 'text-success-600 dark:text-success-400',
      pulse: 'bg-success-500/40',
    },
    hired: {
      node: 'bg-success-500 text-white shadow-sm shadow-success-500/25',
      current: 'bg-success-500 text-white shadow-md shadow-success-500/40 ring-4 ring-success-100 dark:ring-success-900/50',
      line: 'bg-success-500',
      label: 'text-success-700 dark:text-success-300',
      currentLabel: 'text-success-600 dark:text-success-400',
      pulse: 'bg-success-500/40',
    },
  }
  return map[key] ?? map.new!
}

/** Connector line color: use the color of the stage it leads INTO. */
function getConnectorClass(stage: PipelineStage) {
  if (stage.status === 'completed' || stage.status === 'current') {
    return getStageColor(stage.key).line
  }
  return props.isRejected
    ? 'bg-danger-200 dark:bg-danger-900'
    : 'bg-surface-200 dark:bg-surface-700'
}
</script>

<template>
  <div class="relative">
    <!-- Rejected banner -->
    <div
      v-if="isRejected"
      class="mb-4 rounded-lg border border-danger-200 dark:border-danger-900 bg-danger-50 dark:bg-danger-950/30 px-4 py-3 flex items-center gap-3"
    >
      <XCircle class="size-5 text-danger-500 shrink-0" />
      <div>
        <p class="text-sm font-medium text-danger-700 dark:text-danger-300">Application not selected</p>
        <p class="text-xs text-danger-600 dark:text-danger-400 mt-0.5">The team has decided not to move forward at this time. Don't be discouraged — keep applying!</p>
      </div>
    </div>

    <!-- Pipeline steps — full-width, responsive grid -->
    <div class="grid w-full" :style="{ gridTemplateColumns: `repeat(${stages.length * 2 - 1}, minmax(0, 1fr))` }">
      <template v-for="(stage, index) in stages" :key="stage.key">
        <!-- Connector line -->
        <div
          v-if="index > 0"
          class="flex items-center self-start pt-4"
        >
          <div
            class="h-0.5 w-full transition-colors duration-300"
            :class="getConnectorClass(stage)"
          />
        </div>

        <!-- Stage node -->
        <div class="flex flex-col items-center group">
          <div
            class="relative size-8 sm:size-9 rounded-full flex items-center justify-center transition-all duration-300"
            :class="[
              stage.status === 'completed' && getStageColor(stage.key).node,
              stage.status === 'current' && getStageColor(stage.key).current,
              stage.status === 'upcoming' && 'bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500',
              stage.status === 'inactive' && 'bg-surface-100 dark:bg-surface-800 text-surface-300 dark:text-surface-600',
            ]"
          >
            <component :is="getStageIcon(stage.status)" class="size-4" />

            <!-- Pulse animation for current stage -->
            <span
              v-if="stage.status === 'current'"
              class="absolute inset-0 rounded-full animate-ping"
              :class="getStageColor(stage.key).pulse"
            />
          </div>

          <span
            class="mt-2 text-[11px] sm:text-xs font-medium text-center leading-tight"
            :class="[
              stage.status === 'current' && getStageColor(stage.key).currentLabel,
              stage.status === 'completed' && getStageColor(stage.key).label,
              (stage.status === 'upcoming' || stage.status === 'inactive') && 'text-surface-400 dark:text-surface-500',
            ]"
          >
            {{ stage.label }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
