<script setup lang="ts">
/**
 * Settings → AI → Edit
 *
 * Full-page form for editing an existing AI configuration.
 */
import { Loader2, AlertTriangle } from 'lucide-vue-next'

definePageMeta({})

useSeoMeta({
  title: 'Edit AI model — Reqcore',
  description: 'Update an existing AI provider configuration.',
})

interface AiConfigRow {
  id: string
  name: string
  provider: string
  model: string
  baseUrl: string | null
  maxTokens: number
  inputPricePer1m: number | null
  outputPricePer1m: number | null
  isDefaultChatbot: boolean
  isDefaultAnalysis: boolean
  hasApiKey: boolean
}

interface ProviderInfo {
  name: string
  tagline: string
  modelsUrl: string
  apiKeyUrl: string
  signupUrl?: string
  supportsBaseUrl: boolean
  defaultModel: string
  models: { id: string, label: string, description: string, inputPricePer1m?: number, outputPricePer1m?: number, badge?: 'recommended' | 'fast' | 'powerful' | 'cheap' }[]
}

const route = useRoute()
const id = computed(() => String(route.params.id))

const { allowed: canManageAi, isLoading: isPermissionLoading } = usePermission({ scoring: ['create'] })

const { data: configsData, status: configsStatus } = useFetch<AiConfigRow[]>('/api/ai-config', {
  key: 'ai-configs',
  headers: useRequestHeaders(['cookie']),
  default: () => [],
})

const { data: providers, status: providersStatus } = useFetch<Record<string, ProviderInfo>>('/api/ai-config/providers', {
  key: 'ai-providers',
  headers: useRequestHeaders(['cookie']),
})

const config = computed<AiConfigRow | null>(() => {
  return (configsData.value ?? []).find(c => c.id === id.value) ?? null
})

const isReady = computed(() =>
  configsStatus.value !== 'pending' && providersStatus.value !== 'pending' && providers.value,
)
const notFound = computed(() => isReady.value && !config.value)

async function onSaved() {
  await navigateTo('/dashboard/settings/ai')
}
function onCancel() {
  navigateTo('/dashboard/settings/ai')
}
</script>

<template>
  <div>
    <div v-if="isPermissionLoading" class="flex items-center justify-center py-12">
      <Loader2 class="size-6 animate-spin text-surface-400" />
    </div>

    <div
      v-else-if="!canManageAi"
      class="mx-auto max-w-2xl rounded-xl border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-950 p-5 text-sm text-warning-700 dark:text-warning-400 flex items-start gap-3"
    >
      <AlertTriangle class="size-5 shrink-0 mt-0.5" />
      <div>
        <p class="font-semibold mb-1">Insufficient permissions</p>
        <p>You don't have permission to manage AI settings.</p>
      </div>
    </div>

    <div v-else-if="!isReady" class="flex items-center justify-center py-12">
      <Loader2 class="size-6 animate-spin text-surface-400" />
    </div>

    <div
      v-else-if="notFound"
      class="mx-auto max-w-2xl rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-5 text-sm text-danger-700 dark:text-danger-400 flex items-start gap-3"
    >
      <AlertTriangle class="size-5 shrink-0 mt-0.5" />
      <div>
        <p class="font-semibold mb-1">Configuration not found</p>
        <p class="mb-3">This AI configuration no longer exists or you don't have access to it.</p>
        <NuxtLink
          to="/dashboard/settings/ai"
          class="inline-flex items-center gap-1.5 rounded-lg bg-danger-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-700 transition-colors"
        >
          Back to AI configuration
        </NuxtLink>
      </div>
    </div>

    <AiConfigForm
      v-else
      :config="config"
      :providers="providers ?? null"
      :is-first="false"
      @saved="onSaved"
      @cancel="onCancel"
    />
  </div>
</template>
