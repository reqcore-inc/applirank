<script setup lang="ts">
import { Crown, X, Rocket } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { message } = usePreviewReadOnly()
const config = useRuntimeConfig()

function closeModal() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeModal" />

      <div class="relative w-full max-w-md rounded-xl border border-surface-200 bg-white shadow-xl dark:border-surface-800 dark:bg-surface-900">
        <div class="flex items-center justify-between border-b border-surface-200 px-5 py-4 dark:border-surface-800">
          <div class="flex items-center gap-2">
            <Crown class="size-5 text-brand-600 dark:text-brand-400" />
            <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-50">Unlock full editing</h3>
          </div>

          <button
            class="cursor-pointer text-surface-400 transition-colors hover:text-surface-600 dark:hover:text-surface-200"
            @click="closeModal"
          >
            <X class="size-5" />
          </button>
        </div>

        <div class="space-y-4 px-5 py-5">
          <p class="text-sm text-surface-600 dark:text-surface-300">
            {{ message }}
          </p>

          <p class="text-sm text-surface-500 dark:text-surface-400">
            Want write access? Upgrade to a paid hosted plan or deploy your own Reqcore instance.
          </p>

          <div class="flex flex-wrap items-center gap-2">
            <a
              :href="config.public.hostedPlanUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <Rocket class="size-4" />
              Upgrade to hosted plan
            </a>

            <a
              href="https://github.com/reqcore-inc/reqcore"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center rounded-lg border border-surface-300 px-3 py-2 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
            >
              Self-host on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
