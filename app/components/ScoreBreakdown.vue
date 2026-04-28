<script setup lang="ts">
import { Brain, Sparkles, AlertTriangle, ChevronDown, ChevronUp, Loader2, BarChart3, RefreshCw } from 'lucide-vue-next'

interface AiConfigOption {
  id: string
  name: string
  provider: string
  model: string
  isDefaultAnalysis: boolean
  hasApiKey: boolean
}

const props = defineProps<{
  applicationId: string
}>()

const emit = defineEmits<{
  (e: 'scored'): void
}>()

const { track } = useTrack()
const isAnalyzing = ref(false)
const analyzeError = ref<string | null>(null)
const parseFailedDocId = ref<string | null>(null)
const isRetryingParse = ref(false)
const expandedCriterion = ref<string | null>(null)

const { data: scoreData, status, refresh } = useFetch(
  () => `/api/applications/${props.applicationId}/scores`,
  {
    key: computed(() => `scores-${props.applicationId}`),
    headers: useRequestHeaders(['cookie']),
    watch: [() => props.applicationId],
  },
)

// Available AI configurations the user can pick from for this analysis run.
// `selectedAiConfigId === null` means "use the org's default analysis config".
const { data: aiConfigsData } = useFetch<AiConfigOption[]>('/api/ai-config', {
  key: 'ai-configs-analysis-picker',
  headers: useRequestHeaders(['cookie']),
  default: () => [],
})
const aiConfigOptions = computed<AiConfigOption[]>(() =>
  (aiConfigsData.value ?? []).filter((c) => c.hasApiKey),
)
const defaultAnalysisConfig = computed(() =>
  aiConfigOptions.value.find((c) => c.isDefaultAnalysis) ?? null,
)
const selectedAiConfigId = ref<string | null>(null)

// Cache last successful data so switching candidates doesn't flash "Loading scores…"
const cachedScoreData = ref(scoreData.value)
watch(scoreData, (val) => {
  if (val) cachedScoreData.value = val
})

const resolvedScoreData = computed(() => scoreData.value ?? cachedScoreData.value)
const hasScores = computed(() => (resolvedScoreData.value?.scores?.length ?? 0) > 0)
const isInitialLoad = computed(() => status.value === 'pending' && !cachedScoreData.value)

function scoreColor(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 75) return 'text-success-600 dark:text-success-400'
  if (pct >= 40) return 'text-warning-600 dark:text-warning-400'
  return 'text-danger-600 dark:text-danger-400'
}

function barColor(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 75) return 'bg-success-500'
  if (pct >= 40) return 'bg-warning-500'
  return 'bg-danger-500'
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'High'
  if (confidence >= 50) return 'Medium'
  return 'Low'
}

function confidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-success-600 dark:text-success-400'
  if (confidence >= 50) return 'text-warning-600 dark:text-warning-400'
  return 'text-danger-600 dark:text-danger-400'
}

function toggleCriterion(key: string) {
  expandedCriterion.value = expandedCriterion.value === key ? null : key
}

async function runAnalysis() {
  isAnalyzing.value = true
  analyzeError.value = null
  parseFailedDocId.value = null
  try {
    await $fetch(`/api/applications/${props.applicationId}/analyze`, {
      method: 'POST',
      headers: useRequestHeaders(['cookie']),
      body: { aiConfigId: selectedAiConfigId.value },
    })
    await refresh()
    track('ai_analysis_run', { application_id: props.applicationId, ai_config_id: selectedAiConfigId.value })
    emit('scored')
  } catch (err: any) {
    const data = err?.data?.data
    if (data?.code === 'PARSE_FAILED' && data?.documentId) {
      parseFailedDocId.value = data.documentId
    }
    analyzeError.value = err?.data?.statusMessage ?? 'Analysis failed. Make sure AI is configured in settings.'
  } finally {
    isAnalyzing.value = false
  }
}

async function retryParse() {
  if (!parseFailedDocId.value) return
  isRetryingParse.value = true
  analyzeError.value = null
  try {
    await $fetch(`/api/documents/${parseFailedDocId.value}/parse`, {
      method: 'POST',
      headers: useRequestHeaders(['cookie']),
    })
    parseFailedDocId.value = null
    // Automatically re-run analysis after successful parse
    await runAnalysis()
  } catch (err: any) {
    analyzeError.value = err?.data?.statusMessage ?? 'Failed to re-parse the resume. The file may be corrupted or image-based.'
    parseFailedDocId.value = null
  } finally {
    isRetryingParse.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- No scores yet -->
    <div v-if="!isInitialLoad && !hasScores" class="rounded-xl border border-surface-200/80 dark:border-surface-800/60 bg-white dark:bg-surface-900 p-4 shadow-sm shadow-surface-900/[0.03] dark:shadow-none">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="flex size-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
            <Brain class="size-3.5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p class="text-sm font-medium text-surface-600 dark:text-surface-300">No AI analysis yet</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <select
            v-if="aiConfigOptions.length > 1"
            v-model="selectedAiConfigId"
            :disabled="isAnalyzing"
            class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-2 py-1.5 text-xs text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer max-w-[140px] truncate"
            :title="selectedAiConfigId ?? 'Use org default'"
          >
            <option :value="null">Default{{ defaultAnalysisConfig ? ` (${defaultAnalysisConfig.name})` : '' }}</option>
            <option v-for="c in aiConfigOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <button
            :disabled="isAnalyzing"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="runAnalysis"
          >
            <Loader2 v-if="isAnalyzing" class="size-3.5 animate-spin" />
            <Sparkles v-else class="size-3.5" />
            {{ isAnalyzing ? 'Analyzing…' : 'Run Analysis' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading (only on very first load with no cached data) -->
    <div v-else-if="isInitialLoad" class="text-center py-8 text-surface-400">
      Loading scores…
    </div>

    <!-- Score breakdown -->
    <template v-else-if="hasScores">
      <!-- Composite score header -->
      <div class="rounded-xl border border-surface-200/80 dark:border-surface-800/60 bg-white dark:bg-surface-900 p-5 shadow-sm shadow-surface-900/[0.03] dark:shadow-none">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2.5">
            <div class="flex size-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
              <BarChart3 class="size-3.5 text-brand-600 dark:text-brand-400" />
            </div>
            <h3 class="text-sm font-semibold text-surface-800 dark:text-surface-200">Composite Score</h3>
          </div>
          <div class="flex items-center gap-1.5">
            <select
              v-if="aiConfigOptions.length > 1"
              v-model="selectedAiConfigId"
              :disabled="isAnalyzing"
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-2 py-1 text-[11px] text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer max-w-[140px] truncate"
            >
              <option :value="null">Default{{ defaultAnalysisConfig ? ` (${defaultAnalysisConfig.name})` : '' }}</option>
              <option v-for="c in aiConfigOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <button
              :disabled="isAnalyzing"
              class="text-xs text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
              @click="runAnalysis"
            >
              {{ isAnalyzing ? 'Re-scoring…' : 'Re-score' }}
            </button>
          </div>
        </div>

        <div class="flex items-baseline gap-2">
          <span
            class="text-3xl font-bold tabular-nums"
            :class="scoreColor(resolvedScoreData!.latestRun?.compositeScore ?? 0, 100)"
          >
            {{ resolvedScoreData!.latestRun?.compositeScore ?? '—' }}
          </span>
          <span class="text-sm text-surface-400">/ 100</span>
        </div>

        <!-- Run metadata -->
        <div v-if="resolvedScoreData!.latestRun" class="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-surface-400">
          <span>{{ resolvedScoreData!.latestRun.provider }} · {{ resolvedScoreData!.latestRun.model }}</span>
          <span>{{ new Date(resolvedScoreData!.latestRun.createdAt).toLocaleString() }}</span>
        </div>
      </div>

      <!-- Per-criterion breakdown -->
      <div class="space-y-2">
        <div
          v-for="cs in resolvedScoreData!.scores"
          :key="cs.criterionKey"
          class="rounded-xl border border-surface-200/80 dark:border-surface-800/60 bg-white dark:bg-surface-900 shadow-sm shadow-surface-900/[0.03] dark:shadow-none transition-all"
        >
          <!-- Criterion header -->
          <button
            type="button"
            class="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
            @click="toggleCriterion(cs.criterionKey)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                  {{ cs.criterionName ?? cs.criterionKey }}
                </span>
                <span
                  v-if="cs.category"
                  class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset text-surface-500 ring-surface-200 dark:ring-surface-700 bg-surface-50 dark:bg-surface-800"
                >
                  {{ cs.category }}
                </span>
              </div>
              <!-- Progress bar -->
              <div class="flex items-center gap-2">
                <div class="flex-1 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="barColor(cs.score, cs.maxScore)"
                    :style="{ width: `${(cs.score / cs.maxScore) * 100}%` }"
                  />
                </div>
                <span class="text-xs font-semibold tabular-nums shrink-0" :class="scoreColor(cs.score, cs.maxScore)">
                  {{ cs.score }}/{{ cs.maxScore }}
                </span>
              </div>
            </div>
            <component
              :is="expandedCriterion === cs.criterionKey ? ChevronUp : ChevronDown"
              class="size-4 text-surface-400 shrink-0"
            />
          </button>

          <!-- Expanded detail -->
          <div v-if="expandedCriterion === cs.criterionKey" class="px-3 pb-3 space-y-3 border-t border-surface-100 dark:border-surface-800 pt-3">
            <!-- Confidence -->
            <div class="flex items-center gap-2 text-xs">
              <span class="text-surface-400">Confidence:</span>
              <span class="font-semibold" :class="confidenceColor(cs.confidence)">
                {{ confidenceLabel(cs.confidence) }} ({{ cs.confidence }}%)
              </span>
            </div>

            <!-- Evidence -->
            <div v-if="cs.evidence">
              <h4 class="text-xs font-semibold text-surface-500 dark:text-surface-400 mb-1 uppercase tracking-wider">Evidence</h4>
              <p class="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">{{ cs.evidence }}</p>
            </div>

            <!-- Strengths -->
            <div v-if="cs.strengths?.length">
              <h4 class="text-xs font-semibold text-success-600 dark:text-success-400 mb-1">Strengths</h4>
              <ul class="space-y-0.5">
                <li v-for="s in cs.strengths" :key="s" class="text-xs text-surface-600 dark:text-surface-300 flex items-start gap-1.5">
                  <span class="text-success-500 mt-0.5 shrink-0">✓</span>
                  {{ s }}
                </li>
              </ul>
            </div>

            <!-- Gaps -->
            <div v-if="cs.gaps?.length">
              <h4 class="text-xs font-semibold text-warning-600 dark:text-warning-400 mb-1">Gaps</h4>
              <ul class="space-y-0.5">
                <li v-for="g in cs.gaps" :key="g" class="text-xs text-surface-600 dark:text-surface-300 flex items-start gap-1.5">
                  <span class="text-warning-500 mt-0.5 shrink-0">△</span>
                  {{ g }}
                </li>
              </ul>
            </div>

            <!-- Weight -->
            <div class="text-[11px] text-surface-400">
              Weight: {{ cs.weight }}%
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Error -->
    <div
      v-if="analyzeError"
      class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-xs text-danger-700 dark:text-danger-400 flex items-start gap-2"
    >
      <AlertTriangle class="size-4 shrink-0 mt-0.5" />
      <div>
        {{ analyzeError }}
        <div class="mt-2 flex items-center gap-2">
          <button
            v-if="parseFailedDocId"
            :disabled="isRetryingParse"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="retryParse"
          >
            <Loader2 v-if="isRetryingParse" class="size-3 animate-spin" />
            <RefreshCw v-else class="size-3" />
            {{ isRetryingParse ? 'Re-parsing…' : 'Retry CV Parse' }}
          </button>
          <button class="underline" @click="analyzeError = null; parseFailedDocId = null">Dismiss</button>
        </div>
      </div>
    </div>
  </div>
</template>
