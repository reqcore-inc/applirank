<script setup lang="ts">
import { X, AlertTriangle, CheckCircle, Info, AlertCircle, ExternalLink, ChevronDown } from 'lucide-vue-next'
import type { Toast } from '~/composables/useToast'

const { toasts, remove } = useToast()

const expandedToasts = ref(new Set<string>())

function toggleDetails(id: string) {
  if (expandedToasts.value.has(id)) {
    expandedToasts.value.delete(id)
  } else {
    expandedToasts.value.add(id)
  }
}

const typeConfig: Record<string, { icon: typeof AlertTriangle; containerClass: string; iconClass: string; accentClass: string }> = {
  error: {
    icon: AlertCircle,
    containerClass: 'border-danger-200/60 dark:border-danger-800/60 bg-white dark:bg-surface-900 ring-1 ring-danger-100 dark:ring-danger-900/30',
    iconClass: 'text-danger-500',
    accentClass: 'bg-danger-500',
  },
  success: {
    icon: CheckCircle,
    containerClass: 'border-success-200/60 dark:border-success-800/60 bg-white dark:bg-surface-900 ring-1 ring-success-100 dark:ring-success-900/30',
    iconClass: 'text-success-500',
    accentClass: 'bg-success-500',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'border-warning-200/60 dark:border-warning-800/60 bg-white dark:bg-surface-900 ring-1 ring-warning-100 dark:ring-warning-900/30',
    iconClass: 'text-warning-500',
    accentClass: 'bg-warning-500',
  },
  info: {
    icon: Info,
    containerClass: 'border-brand-200/60 dark:border-brand-800/60 bg-white dark:bg-surface-900 ring-1 ring-brand-100 dark:ring-brand-900/30',
    iconClass: 'text-brand-500',
    accentClass: 'bg-brand-500',
  },
}

function getConfig(type: string) {
  return typeConfig[type] ?? typeConfig.info!
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-3 max-w-md w-full pointer-events-none"
      aria-live="polite"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="opacity-0 translate-y-3 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-3 scale-95"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto rounded-xl border shadow-xl overflow-hidden backdrop-blur-sm"
          :class="getConfig(toast.type).containerClass"
        >
          <!-- Accent bar -->
          <div class="h-0.5" :class="getConfig(toast.type).accentClass" />

          <div class="p-4">
            <div class="flex items-start gap-3">
              <div class="flex items-center justify-center size-8 rounded-lg bg-surface-50 dark:bg-surface-800 shrink-0">
                <component
                  :is="getConfig(toast.type).icon"
                  class="size-4"
                  :class="getConfig(toast.type).iconClass"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-surface-900 dark:text-surface-100 leading-snug">
                  {{ toast.title }}
                </p>
                <p
                  v-if="toast.message"
                  class="mt-1 text-xs text-surface-500 dark:text-surface-400 leading-relaxed"
                >
                  {{ toast.message }}
                </p>

                <!-- Expandable details toggle -->
                <button
                  v-if="toast.details"
                  type="button"
                  class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
                  @click="toggleDetails(toast.id)"
                >
                  <ChevronDown
                    class="size-3.5 transition-transform duration-200"
                    :class="{ 'rotate-180': expandedToasts.has(toast.id) }"
                  />
                  {{ expandedToasts.has(toast.id) ? 'Hide details' : 'Show details' }}
                </button>

                <!-- Expanded details -->
                <div
                  v-if="toast.details && expandedToasts.has(toast.id)"
                  class="mt-2 rounded-lg bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 p-2.5 text-[11px] font-mono text-surface-600 dark:text-surface-400 leading-relaxed break-all max-h-40 overflow-y-auto"
                >
                  {{ toast.details }}
                </div>

                <div v-if="toast.link" class="mt-2.5">
                  <a
                    :href="toast.link.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                  >
                    {{ toast.link.label }}
                    <ExternalLink class="size-3" />
                  </a>
                </div>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-lg p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                @click="remove(toast.id)"
              >
                <X class="size-4" />
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
