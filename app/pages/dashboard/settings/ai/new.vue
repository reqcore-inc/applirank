<script setup lang="ts">
/**
 * Settings → AI → New
 *
 * Full-page form for adding a new AI configuration. Replaces the old modal
 * for a calmer, less dense experience.
 */
import { Loader2, AlertTriangle } from 'lucide-vue-next'

definePageMeta({})

useSeoMeta({
  title: 'Add AI model — Reqcore',
  description: 'Connect a new AI provider and model.',
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

const isReady = computed(() =>
  configsStatus.value !== 'pending' && providersStatus.value !== 'pending' && providers.value,
)
const isFirst = computed(() => (configsData.value ?? []).length === 0)

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
        <p>You don't have permission to manage AI settings. Contact your organization owner or admin.</p>
      </div>
    </div>

    <div v-else-if="!isReady" class="flex items-center justify-center py-12">
      <Loader2 class="size-6 animate-spin text-surface-400" />
    </div>

    <AiConfigForm
      v-else
      :config="null"
      :providers="providers ?? null"
      :is-first="isFirst"
      @saved="onSaved"
      @cancel="onCancel"
    />
  </div>
</template>
