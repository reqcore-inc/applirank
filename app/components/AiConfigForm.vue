<script setup lang="ts">
/**
 * AiConfigForm
 *
 * Full-page form used by both the "Add a model" and "Edit model" pages.
 * Designed to be calm and progressive: each step lives in its own card,
 * advanced fields (output tokens, pricing) are collapsed by default, and
 * the API key panel only nudges users with the help they actually need.
 */
import {
  Brain, Sparkles, Eye, EyeOff, ExternalLink, Loader2, Check,
  Save, Zap, Star, AlertTriangle, ChevronDown, KeyRound, ArrowLeft,
} from 'lucide-vue-next'

interface ModelInfo {
  id: string
  label: string
  description: string
  inputPricePer1m?: number
  outputPricePer1m?: number
  badge?: 'recommended' | 'fast' | 'powerful' | 'cheap'
}

interface ProviderInfo {
  name: string
  tagline: string
  modelsUrl: string
  apiKeyUrl: string
  signupUrl?: string
  supportsBaseUrl: boolean
  defaultModel: string
  models: ModelInfo[]
}

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

const props = defineProps<{
  /** Existing config when editing; null when creating. */
  config: AiConfigRow | null
  providers: Record<string, ProviderInfo> | null
  /** True if no other configs exist yet — first save auto-claims both default slots. */
  isFirst: boolean
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const toast = useToast()

const isEdit = computed(() => props.config !== null)

const DEFAULT_MAX_TOKENS = 16384

const form = ref({
  name: props.config?.name ?? '',
  provider: props.config?.provider ?? 'openai',
  model: props.config?.model ?? '',
  apiKey: '',
  baseUrl: props.config?.baseUrl ?? '',
  maxTokens: props.config?.maxTokens ?? DEFAULT_MAX_TOKENS,
  inputPricePer1m: props.config?.inputPricePer1m ?? null as number | null,
  outputPricePer1m: props.config?.outputPricePer1m ?? null as number | null,
  isDefaultChatbot: !isEdit.value && props.isFirst,
  isDefaultAnalysis: !isEdit.value && props.isFirst,
})

// When creating, pre-pick the first model of the default provider.
if (!isEdit.value && props.providers) {
  const provKey = props.providers.openai ? 'openai' : Object.keys(props.providers)[0] ?? 'openai'
  const provInfo = props.providers[provKey]
  const firstModel = provInfo?.models[0]
  form.value.provider = provKey
  if (firstModel) {
    form.value.model = firstModel.id
    form.value.name = firstModel.label
    form.value.inputPricePer1m = firstModel.inputPricePer1m ?? null
    form.value.outputPricePer1m = firstModel.outputPricePer1m ?? null
  }
}

const showApiKey = ref(false)
const showAdvanced = ref(false)
const isSaving = ref(false)
const isTesting = ref(false)
const testResult = ref<{ success: boolean, message?: string } | null>(null)

const selectedProvider = computed<ProviderInfo | null>(() =>
  props.providers?.[form.value.provider] ?? null,
)

const isCustomProvider = computed(() => form.value.provider === 'openai_compatible')

function pickModel(m: ModelInfo) {
  form.value.model = m.id
  form.value.inputPricePer1m = m.inputPricePer1m ?? form.value.inputPricePer1m
  form.value.outputPricePer1m = m.outputPricePer1m ?? form.value.outputPricePer1m
  // Auto-set the friendly name only if the user hasn't customised it.
  if (!form.value.name || /^(GPT|Claude|Gemini|Llama|Mistral|New configuration)/i.test(form.value.name)) {
    form.value.name = m.label
  }
}

function pickProvider(key: string) {
  form.value.provider = key
  const first = props.providers?.[key]?.models[0]
  if (first) {
    pickModel(first)
  }
  else {
    form.value.model = ''
    form.value.inputPricePer1m = null
    form.value.outputPricePer1m = null
  }
}

const canSave = computed(() => {
  if (!form.value.name.trim()) return false
  if (!form.value.model.trim()) return false
  if (!isEdit.value && !form.value.apiKey) return false
  if (isCustomProvider.value && !form.value.baseUrl) return false
  return true
})

async function handleSave() {
  if (!canSave.value) return
  isSaving.value = true
  try {
    const body: Record<string, unknown> = {
      name: form.value.name.trim(),
      provider: form.value.provider,
      model: form.value.model.trim(),
      maxTokens: form.value.maxTokens,
      inputPricePer1m: form.value.inputPricePer1m,
      outputPricePer1m: form.value.outputPricePer1m,
    }
    if (isCustomProvider.value) body.baseUrl = form.value.baseUrl
    if (form.value.apiKey) body.apiKey = form.value.apiKey

    if (isEdit.value && props.config) {
      await $fetch(`/api/ai-config/${props.config.id}`, {
        method: 'PATCH',
        body,
        headers: useRequestHeaders(['cookie']),
      })
      toast.success('Configuration updated', `"${form.value.name.trim()}" saved.`)
    }
    else {
      body.isDefaultChatbot = form.value.isDefaultChatbot
      body.isDefaultAnalysis = form.value.isDefaultAnalysis
      await $fetch('/api/ai-config', {
        method: 'POST',
        body,
        headers: useRequestHeaders(['cookie']),
      })
      toast.success('Configuration added', `"${form.value.name.trim()}" is ready to use.`)
    }
    emit('saved')
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? err?.message ?? 'Failed to save configuration.'
    toast.error('Save failed', { message })
  }
  finally {
    isSaving.value = false
  }
}

async function handleTest() {
  if (!isEdit.value || !props.config) {
    toast.info('Save first', 'Save the configuration before testing the connection.')
    return
  }
  isTesting.value = true
  testResult.value = null
  try {
    await $fetch(`/api/ai-config/${props.config.id}/test-connection`, {
      method: 'POST',
      headers: useRequestHeaders(['cookie']),
    })
    testResult.value = { success: true }
    toast.success('Connection works', 'Provider responded correctly.')
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? err?.message ?? 'Connection test failed.'
    testResult.value = { success: false, message }
    toast.error('Test failed', { message })
  }
  finally {
    isTesting.value = false
  }
}

const badgeClass = (badge?: ModelInfo['badge']) => {
  switch (badge) {
    case 'recommended': return 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border-brand-200 dark:border-brand-800'
    case 'fast': return 'bg-success-50 text-success-700 dark:bg-success-950/50 dark:text-success-300 border-success-200 dark:border-success-800'
    case 'powerful': return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    case 'cheap': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    default: return 'hidden'
  }
}
const badgeLabel = (badge?: ModelInfo['badge']) => {
  switch (badge) {
    case 'recommended': return 'Recommended'
    case 'fast': return 'Fast'
    case 'powerful': return 'Powerful'
    case 'cheap': return 'Low cost'
    default: return ''
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl pb-32">
    <!-- Header -->
    <div class="mb-6">
      <NuxtLink
        to="/dashboard/settings/ai"
        class="inline-flex items-center gap-1 text-xs font-medium text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors mb-3"
      >
        <ArrowLeft class="size-3.5" />
        Back to AI configuration
      </NuxtLink>
      <div class="flex items-center gap-2.5">
        <div class="flex size-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
          <Brain class="size-5" />
        </div>
        <div>
          <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-50">
            {{ isEdit ? `Edit ${config?.name || 'configuration'}` : 'Add an AI model' }}
          </h1>
          <p class="text-xs text-surface-500 dark:text-surface-400">
            {{ isEdit
              ? 'Update settings, rotate the API key, or change pricing for this model.'
              : 'Connect an AI provider so the chatbot and candidate analysis can use it.' }}
          </p>
        </div>
      </div>
    </div>

    <div class="space-y-5">
      <!-- 1. Provider -->
      <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <header class="mb-4">
          <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Provider</h2>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
            Choose where the model runs. We'll suggest the best models for that provider next.
          </p>
        </header>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            v-for="(info, key) in providers ?? {}"
            :key="key"
            type="button"
            class="flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer"
            :class="form.provider === key
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500/30'
              : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-brand-300 dark:hover:border-brand-700'"
            @click="pickProvider(String(key))"
          >
            <span class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ info.name }}</span>
            <span class="text-[11px] text-surface-500 dark:text-surface-400 line-clamp-2">{{ info.tagline }}</span>
          </button>
        </div>
      </section>

      <!-- 2. Model -->
      <section v-if="selectedProvider" class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <header class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Model</h2>
            <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              Pick a recommended model — or paste any model identifier the provider supports.
            </p>
          </div>
          <a
            v-if="selectedProvider.modelsUrl"
            :href="selectedProvider.modelsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline shrink-0"
          >
            Browse all <ExternalLink class="size-3" />
          </a>
        </header>

        <div v-if="selectedProvider.models.length" class="grid sm:grid-cols-2 gap-2">
          <button
            v-for="m in selectedProvider.models"
            :key="m.id"
            type="button"
            class="rounded-xl border px-3 py-3 text-left transition-colors cursor-pointer"
            :class="form.model === m.id
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500/30'
              : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-brand-300 dark:hover:border-brand-700'"
            @click="pickModel(m)"
          >
            <div class="flex items-start justify-between gap-2 mb-1">
              <span class="text-sm font-medium text-surface-900 dark:text-surface-100">{{ m.label }}</span>
              <span
                v-if="m.badge"
                class="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                :class="badgeClass(m.badge)"
              >
                <Star v-if="m.badge === 'recommended'" class="size-2.5" />
                <Zap v-else-if="m.badge === 'fast'" class="size-2.5" />
                {{ badgeLabel(m.badge) }}
              </span>
            </div>
            <p class="text-[11px] text-surface-500 dark:text-surface-400 line-clamp-2">{{ m.description }}</p>
            <div v-if="m.inputPricePer1m != null || m.outputPricePer1m != null" class="mt-2 text-[10px] text-surface-400">
              ${{ m.inputPricePer1m?.toFixed(2) ?? '—' }} in · ${{ m.outputPricePer1m?.toFixed(2) ?? '—' }} out / 1M tokens
            </div>
          </button>
        </div>

        <details class="mt-4">
          <summary class="text-xs text-surface-500 dark:text-surface-400 cursor-pointer hover:text-surface-700 dark:hover:text-surface-200 select-none inline-flex items-center gap-1">
            <ChevronDown class="size-3 transition-transform group-open:rotate-180" />
            {{ selectedProvider.models.length ? 'Use a different model identifier' : 'Set the model identifier' }}
          </summary>
          <div class="mt-3">
            <input
              v-model="form.model"
              type="text"
              placeholder="e.g. gpt-4.1-mini, llama-3.1-70b, mistral-large-latest"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
            >
            <p class="mt-1 text-[11px] text-surface-500">
              The exact string the provider expects in API calls.
            </p>
          </div>
        </details>
      </section>

      <!-- 3. Connection -->
      <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <header class="mb-4">
          <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Connection</h2>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
            Give this configuration a name and connect your API key. Keys are encrypted with AES-256-GCM and never sent back to the browser.
          </p>
        </header>

        <div class="space-y-5">
          <!-- Friendly name -->
          <div>
            <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Display name
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g. GPT-4o (production)"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            >
            <p class="mt-1 text-[11px] text-surface-500">
              Shown in the model picker. Use something memorable.
            </p>
          </div>

          <!-- Base URL (custom only) -->
          <div v-if="isCustomProvider">
            <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Base URL
            </label>
            <input
              v-model="form.baseUrl"
              type="url"
              placeholder="https://api.example.com/v1"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
            >
            <p class="mt-1 text-[11px] text-surface-500">
              Any OpenAI-compatible endpoint (Ollama, vLLM, OpenRouter, etc).
            </p>
          </div>

          <!-- API key -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-medium text-surface-700 dark:text-surface-300">
                API key
                <span v-if="isEdit" class="ml-1 text-surface-400 font-normal">(leave blank to keep current)</span>
              </label>
              <a
                v-if="selectedProvider?.apiKeyUrl"
                :href="selectedProvider.apiKeyUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 hover:underline"
              >
                Get a key <ExternalLink class="size-3" />
              </a>
            </div>
            <div class="relative">
              <input
                v-model="form.apiKey"
                :type="showApiKey ? 'text' : 'password'"
                :placeholder="isEdit ? '••••••••••••' : 'sk-…'"
                autocomplete="off"
                class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 pr-10 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
              >
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center px-3 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 cursor-pointer"
                :title="showApiKey ? 'Hide key' : 'Show key'"
                @click="showApiKey = !showApiKey"
              >
                <Eye v-if="showApiKey" class="size-4" />
                <EyeOff v-else class="size-4" />
              </button>
            </div>
          </div>

          <!-- Test connection -->
          <div v-if="isEdit" class="flex items-center gap-3 pt-1">
            <button
              type="button"
              :disabled="isTesting"
              class="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              @click="handleTest"
            >
              <Loader2 v-if="isTesting" class="size-3.5 animate-spin" />
              <Zap v-else class="size-3.5" />
              {{ isTesting ? 'Testing…' : 'Test connection' }}
            </button>
            <span
              v-if="testResult?.success"
              class="inline-flex items-center gap-1 text-xs text-success-600 dark:text-success-400"
            >
              <Check class="size-3.5" /> Connection verified.
            </span>
            <span
              v-else-if="testResult && !testResult.success"
              class="inline-flex items-start gap-1 text-xs text-danger-600 dark:text-danger-400"
            >
              <AlertTriangle class="size-3.5 mt-px" /> {{ testResult.message }}
            </span>
          </div>
        </div>
      </section>

      <!-- Defaults (only when adding and not first) -->
      <section v-if="!isEdit && !isFirst" class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <header class="mb-4">
          <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Use as default</h2>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
            Optional. You can change defaults later from the list view.
          </p>
        </header>
        <div class="space-y-2">
          <label class="flex items-start gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
            <input
              v-model="form.isDefaultChatbot"
              type="checkbox"
              class="mt-0.5 size-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            >
            <div class="flex-1">
              <div class="flex items-center gap-1.5 text-sm font-medium text-surface-900 dark:text-surface-100">
                <Sparkles class="size-3.5 text-brand-500" />
                Chatbot conversations
              </div>
              <p class="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">
                Use this model when chatting with candidates and recruiters.
              </p>
            </div>
          </label>
          <label class="flex items-start gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 cursor-pointer hover:border-warning-300 dark:hover:border-warning-700 transition-colors">
            <input
              v-model="form.isDefaultAnalysis"
              type="checkbox"
              class="mt-0.5 size-4 rounded border-surface-300 text-warning-600 focus:ring-warning-500"
            >
            <div class="flex-1">
              <div class="flex items-center gap-1.5 text-sm font-medium text-surface-900 dark:text-surface-100">
                <Star class="size-3.5 text-warning-500" />
                Candidate analysis
              </div>
              <p class="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">
                Use this model to score and analyse applications.
              </p>
            </div>
          </label>
        </div>
      </section>

      <p
        v-if="!isEdit && isFirst"
        class="rounded-xl border border-brand-200 dark:border-brand-900 bg-brand-50/70 dark:bg-brand-950/30 px-4 py-3 text-xs text-brand-700 dark:text-brand-300 flex items-start gap-2"
      >
        <Sparkles class="size-3.5 mt-0.5 shrink-0" />
        This is your first model — it will automatically become the default for both the chatbot and candidate analysis.
      </p>

      <!-- Advanced -->
      <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
        <button
          type="button"
          class="w-full px-5 sm:px-6 py-4 flex items-center justify-between text-left cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
          @click="showAdvanced = !showAdvanced"
        >
          <div>
            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">Advanced</h2>
            <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              Output token limit and pricing. Defaults work for most setups.
            </p>
          </div>
          <ChevronDown
            class="size-4 text-surface-400 transition-transform"
            :class="showAdvanced ? 'rotate-180' : ''"
          />
        </button>
        <div v-if="showAdvanced" class="border-t border-surface-200 dark:border-surface-800 px-5 sm:px-6 py-5 space-y-5">
          <!-- Max output tokens -->
          <div>
            <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Max output tokens
            </label>
            <input
              v-model.number="form.maxTokens"
              type="number"
              min="256"
              max="200000"
              step="256"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
            >
            <p class="mt-1 text-[11px] text-surface-500">
              Maximum tokens the model can generate per response. Range: 256 – 200,000. Defaults to {{ DEFAULT_MAX_TOKENS.toLocaleString() }}.
            </p>
          </div>

          <!-- Pricing -->
          <div>
            <h3 class="text-xs font-medium text-surface-700 dark:text-surface-300 mb-2">
              Pricing per 1M tokens
              <span class="ml-1 text-surface-400 font-normal">(USD — auto-filled, adjust to match your billing)</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1">Input</label>
                <input
                  v-model.number="form.inputPricePer1m"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
                >
              </div>
              <div>
                <label class="block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1">Output</label>
                <input
                  v-model.number="form.outputPricePer1m"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
                >
              </div>
            </div>
          </div>
        </div>
      </section>

      <p class="text-[11px] text-surface-500 dark:text-surface-400 flex items-start gap-1.5">
        <KeyRound class="size-3 mt-0.5 shrink-0" />
        <span>API keys are encrypted at rest with AES-256-GCM and never returned to the browser.</span>
      </p>
    </div>

    <!-- Sticky save bar -->
    <div class="fixed inset-x-0 bottom-0 z-20 border-t border-surface-200 dark:border-surface-800 bg-white/90 dark:bg-surface-950/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-surface-950/70">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors cursor-pointer"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="!canSave || isSaving"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          @click="handleSave"
        >
          <Loader2 v-if="isSaving" class="size-4 animate-spin" />
          <Save v-else class="size-4" />
          {{ isSaving ? 'Saving…' : (isEdit ? 'Save changes' : 'Add model') }}
        </button>
      </div>
    </div>
  </div>
</template>
