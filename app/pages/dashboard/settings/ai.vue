<script setup lang="ts">
import {
  Brain, Save, AlertTriangle, ExternalLink, Loader2, Check,
  Eye, EyeOff, Shield, DollarSign, Zap,
} from 'lucide-vue-next'

definePageMeta({})

useSeoMeta({
  title: 'AI Configuration — Reqcore',
  description: 'Configure AI provider, model, and API key for candidate scoring',
})

const { allowed: canManageAi, isLoading: isPermissionLoading } = usePermission({ scoring: ['create'] })
const toast = useToast()

// ─────────────────────────────────────────────
// Fetch current config
// ─────────────────────────────────────────────

const { data: currentConfig, refresh: refreshConfig } = useFetch('/api/ai-config', {
  key: 'ai-config',
  headers: useRequestHeaders(['cookie']),
})

// ─────────────────────────────────────────────
// Fetch provider registry
// ─────────────────────────────────────────────

const { data: providers } = useFetch('/api/ai-config/providers', {
  key: 'ai-providers',
  headers: useRequestHeaders(['cookie']),
})

// ─────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────

const form = ref({
  provider: 'openai' as string,
  model: '' as string,
  apiKey: '' as string,
  baseUrl: '' as string,
  maxTokens: 4096 as number,
  inputPricePer1m: null as number | null,
  outputPricePer1m: null as number | null,
})

const showApiKey = ref(false)
const isSaving = ref(false)
const isTesting = ref(false)
const testResult = ref<{ success: boolean; message?: string } | null>(null)

// Seed form from existing config
watch(currentConfig, (config) => {
  if (config) {
    form.value.provider = config.provider ?? 'openai'
    form.value.model = config.model ?? ''
    form.value.baseUrl = config.baseUrl ?? ''
    form.value.maxTokens = config.maxTokens ?? 4096
    form.value.inputPricePer1m = config.inputPricePer1m != null ? Number(config.inputPricePer1m) : null
    form.value.outputPricePer1m = config.outputPricePer1m != null ? Number(config.outputPricePer1m) : null
    // API key is never sent back
    form.value.apiKey = ''
  }
}, { immediate: true })

// ─────────────────────────────────────────────
// Computed helpers
// ─────────────────────────────────────────────

const selectedProviderInfo = computed(() => {
  if (!providers.value) return null
  return providers.value[form.value.provider] ?? null
})

const availableModels = computed(() => {
  return selectedProviderInfo.value?.models ?? []
})

const providerApiKeyUrl = computed(() => {
  return selectedProviderInfo.value?.apiKeyUrl ?? null
})

const providerModelsUrl = computed(() => {
  return selectedProviderInfo.value?.modelsUrl ?? null
})

const isCustomProvider = computed(() => form.value.provider === 'openai_compatible')

const hasExistingKey = computed(() => currentConfig.value?.hasApiKey === true)

// ─────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────

async function handleSave() {
  if (!canManageAi.value) return

  isSaving.value = true

  try {
    const body: Record<string, unknown> = {
      provider: form.value.provider,
      model: form.value.model,
      maxTokens: form.value.maxTokens,
      inputPricePer1m: form.value.inputPricePer1m,
      outputPricePer1m: form.value.outputPricePer1m,
    }
    if (form.value.apiKey) body.apiKey = form.value.apiKey
    if (isCustomProvider.value && form.value.baseUrl) body.baseUrl = form.value.baseUrl

    await $fetch('/api/ai-config', {
      method: 'POST',
      body,
      headers: useRequestHeaders(['cookie']),
    })

    toast.success('AI configuration saved', 'Your provider and model settings have been updated.')
    form.value.apiKey = '' // Clear after save
    testResult.value = null
    await refreshConfig()
  } catch (err: any) {
    const statusMessage = err?.data?.statusMessage ?? err?.message ?? 'An unexpected error occurred while saving.'

    toast.error('Failed to save AI configuration', {
      message: statusMessage,
      statusCode: err?.data?.statusCode,
    })
  } finally {
    isSaving.value = false
  }
}

async function testConnection() {
  isTesting.value = true
  testResult.value = null

  try {
    await $fetch('/api/ai-config/test-connection', {
      method: 'POST',
      headers: useRequestHeaders(['cookie']),
    })
    testResult.value = { success: true }
    toast.success('Connection successful', 'Your AI provider responded correctly.')
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? err?.message ?? 'Connection test failed.'
    testResult.value = { success: false, message }
    toast.error('Connection test failed', { message })
  }
  finally {
    isTesting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <!-- Page title -->
    <div class="mb-6">
      <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-50">
        AI Configuration
      </h1>
      <p class="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
        Configure your AI provider and model for candidate analysis scoring.
      </p>
    </div>

    <!-- Permission guard -->
    <div
      v-if="isPermissionLoading"
      class="flex items-center justify-center py-12"
    >
      <Loader2 class="size-6 animate-spin text-surface-400" />
    </div>

    <div
      v-else-if="!canManageAi"
      class="rounded-xl border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-950 p-5 text-sm text-warning-700 dark:text-warning-400 flex items-start gap-3"
    >
      <AlertTriangle class="size-5 shrink-0 mt-0.5" />
      <div>
        <p class="font-semibold mb-1">Insufficient permissions</p>
        <p>You don't have permission to manage AI settings. Contact your organization owner or admin.</p>
      </div>
    </div>

    <form v-else @submit.prevent="handleSave">
      <!-- Provider & Model section -->
      <section class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
        <div class="px-4 sm:px-6 py-5 border-b border-surface-200 dark:border-surface-800">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center size-10 shrink-0 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
              <Brain class="size-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Provider & Model</h2>
              <p class="text-sm text-surface-500 dark:text-surface-400">Choose your AI provider and select a model.</p>
            </div>
          </div>
        </div>

        <div class="px-4 sm:px-6 py-5 space-y-5">
          <!-- Provider -->
          <div>
            <label for="ai-provider" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Provider
            </label>
            <select
              id="ai-provider"
              v-model="form.provider"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            >
              <option v-if="providers" v-for="(info, key) in providers" :key="key" :value="key">
                {{ info.name }}
              </option>
            </select>
          </div>

          <!-- Model -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="ai-model" class="text-sm font-medium text-surface-700 dark:text-surface-300">Model</label>
              <a
                v-if="providerModelsUrl"
                :href="providerModelsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                View models <ExternalLink class="size-3" />
              </a>
            </div>
            <input
              id="ai-model"
              v-model="form.model"
              type="text"
              list="ai-model-suggestions"
              placeholder="e.g. gpt-4.1-mini or your custom model name"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
            <datalist id="ai-model-suggestions">
              <option v-for="m in availableModels" :key="m" :value="m" />
            </datalist>
            <p class="mt-1.5 text-xs text-surface-400 dark:text-surface-500">
              Pick a suggested model or type any model name your provider supports.
            </p>
          </div>

          <!-- Base URL (for custom providers) -->
          <div v-if="isCustomProvider">
            <label for="ai-base-url" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Base URL
            </label>
            <input
              id="ai-base-url"
              v-model="form.baseUrl"
              type="url"
              placeholder="https://api.your-provider.com/v1"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
            <p class="mt-1.5 text-xs text-surface-400 dark:text-surface-500">
              The OpenAI-compatible base URL for your provider.
            </p>
          </div>

          <!-- Max tokens -->
          <div>
            <label for="ai-max-tokens" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Max Tokens
            </label>
            <input
              id="ai-max-tokens"
              v-model.number="form.maxTokens"
              type="number"
              min="256"
              max="32768"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
            <p class="mt-1.5 text-xs text-surface-400 dark:text-surface-500">
              Maximum tokens for AI analysis output (256–32,768).
            </p>
          </div>

          <!-- Save button & Test connection -->
          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              :disabled="isSaving || (!form.model && !isCustomProvider)"
              class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Loader2 v-if="isSaving" class="size-4 animate-spin" />
              <Save v-else class="size-4" />
              {{ isSaving ? 'Saving…' : 'Save configuration' }}
            </button>
            <button
              v-if="hasExistingKey"
              type="button"
              :disabled="isTesting"
              class="inline-flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @click="testConnection"
            >
              <Loader2 v-if="isTesting" class="size-4 animate-spin" />
              <Zap v-else class="size-4" />
              {{ isTesting ? 'Testing…' : 'Test connection' }}
            </button>
          </div>

          <!-- Test result -->
          <div v-if="testResult" class="mt-3">
            <div
              v-if="testResult.success"
              class="flex items-center gap-2 text-xs text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/40 border border-success-200 dark:border-success-900 rounded-lg px-3 py-2"
            >
              <Check class="size-3.5" />
              AI provider is connected and responding.
            </div>
            <div
              v-else
              class="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2"
            >
              <AlertTriangle class="size-3.5 shrink-0 mt-0.5" />
              <span>{{ testResult.message }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Pricing section -->
      <section class="mt-8 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
        <div class="px-4 sm:px-6 py-5 border-b border-surface-200 dark:border-surface-800">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center size-10 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <DollarSign class="size-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Cost Tracking</h2>
              <p class="text-sm text-surface-500 dark:text-surface-400">Set your model's pricing to track spend on the AI Analysis page.</p>
            </div>
          </div>
        </div>

        <div class="px-4 sm:px-6 py-5 space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="ai-input-price" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Input price <span class="text-surface-400 font-normal">/ 1M tokens</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">$</span>
                <input
                  id="ai-input-price"
                  :value="form.inputPricePer1m"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 pl-7 pr-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors tabular-nums"
                  @input="form.inputPricePer1m = ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null"
                />
              </div>
            </div>
            <div>
              <label for="ai-output-price" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Output price <span class="text-surface-400 font-normal">/ 1M tokens</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">$</span>
                <input
                  id="ai-output-price"
                  :value="form.outputPricePer1m"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 pl-7 pr-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors tabular-nums"
                  @input="form.outputPricePer1m = ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : null"
                />
              </div>
            </div>
          </div>
          <p class="text-xs text-surface-400 dark:text-surface-500">
            Find pricing on your provider's website. Costs are calculated locally — nothing is sent externally.
          </p>
        </div>
      </section>

      <!-- API Key section -->
      <section class="mt-8 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
        <div class="px-4 sm:px-6 py-5 border-b border-surface-200 dark:border-surface-800">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="flex items-center justify-center size-10 shrink-0 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
                <Shield class="size-5" />
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">API Key</h2>
                <p class="text-sm text-surface-500 dark:text-surface-400">Your key is encrypted at rest using AES-256-GCM.</p>
              </div>
            </div>
            <a
              v-if="providerApiKeyUrl"
              :href="providerApiKeyUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline shrink-0"
            >
              Get API key <ExternalLink class="size-3" />
            </a>
          </div>
        </div>

        <div class="px-4 sm:px-6 py-5 space-y-5">
          <div v-if="hasExistingKey" class="flex items-center gap-2 text-xs text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/40 border border-success-200 dark:border-success-900 rounded-lg px-3 py-2">
            <Check class="size-3.5" />
            API key is configured and encrypted.
          </div>

          <div>
            <label for="ai-api-key" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              {{ hasExistingKey ? 'Replace API key' : 'API key' }}
            </label>
            <div class="relative">
              <input
                id="ai-api-key"
                v-model="form.apiKey"
                :type="showApiKey ? 'text' : 'password'"
                :placeholder="hasExistingKey ? 'Enter new key to replace existing' : 'sk-... or your provider API key'"
                autocomplete="off"
                spellcheck="false"
                data-1p-ignore
                data-lpignore="true"
                class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 pr-10 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                @click="showApiKey = !showApiKey"
              >
                <component :is="showApiKey ? EyeOff : Eye" class="size-4" />
              </button>
            </div>
            <p class="mt-1.5 text-xs text-surface-400 dark:text-surface-500">
              Your API key is never exposed in API responses or logs.
            </p>
          </div>
        </div>
      </section>
    </form>
  </div>
</template>
