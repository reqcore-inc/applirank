<script setup lang="ts">
import {
  Brain, Sparkles, TrendingUp, AlertTriangle, CheckCircle2,
  XCircle, Zap, Clock, BarChart3, Activity, AlertCircle, DollarSign,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'AI Analysis — Reqcore',
  robots: 'noindex, nofollow',
})

const { data: stats, status: fetchStatus, error, refresh } = useFetch('/api/ai-analysis/stats', {
  key: 'ai-analysis-stats',
  headers: useRequestHeaders(['cookie']),
})

const summary = computed(() => stats.value?.summary ?? {
  totalRuns: 0,
  completedRuns: 0,
  failedRuns: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
})

const pricing = computed(() => stats.value?.pricing ?? { inputPricePer1m: null, outputPricePer1m: null, configured: false })

const dailyRuns = computed(() => stats.value?.dailyRuns ?? [])
const recentRuns = computed(() => stats.value?.recentRuns ?? [])
const modelBreakdown = computed(() => stats.value?.modelBreakdown ?? [])

const successRate = computed(() => {
  if (summary.value.totalRuns === 0) return 0
  return Math.round((summary.value.completedRuns / summary.value.totalRuns) * 100)
})

// ─── Cost computations ───
function calcCost(promptTokens: number, completionTokens: number): number | null {
  const ip = pricing.value.inputPricePer1m
  const op = pricing.value.outputPricePer1m
  if (ip == null && op == null) return null
  return ((promptTokens / 1_000_000) * (ip ?? 0)) + ((completionTokens / 1_000_000) * (op ?? 0))
}

const totalCost = computed(() => calcCost(summary.value.totalPromptTokens, summary.value.totalCompletionTokens))

// Chart bar heights (simple bar chart)
const maxDailyCount = computed(() => Math.max(...dailyRuns.value.map((d: any) => d.count), 1))
const maxDailyTokens = computed(() => Math.max(...dailyRuns.value.map((d: any) => d.promptTokens + d.completionTokens), 1))

const chartStartDate = computed(() => {
  const first = dailyRuns.value[0]
  return first ? formatDate(first.date) : ''
})
const chartEndDate = computed(() => {
  const last = dailyRuns.value.at(-1)
  return last ? formatDate(last.date) : ''
})

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatCost(cost: number | null): string {
  if (cost == null) return '—'
  if (cost < 0.01) return '<$0.01'
  return `$${cost.toFixed(2)}`
}

function formatCostPrecise(cost: number | null): string {
  if (cost == null) return '—'
  if (cost < 0.001) return '<$0.001'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDateTime(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function scoreColor(score: number | null): string {
  if (score == null) return 'text-surface-400'
  if (score >= 75) return 'text-success-600 dark:text-success-400'
  if (score >= 40) return 'text-warning-600 dark:text-warning-400'
  return 'text-danger-600 dark:text-danger-400'
}

function scoreBadgeClass(score: number | null): string {
  if (score == null) return ''
  if (score >= 75) return 'bg-success-50 text-success-700 ring-success-200/60 dark:bg-success-950 dark:text-success-400 dark:ring-success-800/40'
  if (score >= 40) return 'bg-warning-50 text-warning-700 ring-warning-200/60 dark:bg-warning-950 dark:text-warning-400 dark:ring-warning-800/40'
  return 'bg-danger-50 text-danger-700 ring-danger-200/60 dark:bg-danger-950 dark:text-danger-400 dark:ring-danger-800/40'
}

function statusBadgeClass(status: string): string {
  if (status === 'completed') return 'bg-success-50 text-success-700 ring-success-200/60 dark:bg-success-950 dark:text-success-400 dark:ring-success-800/40'
  if (status === 'failed') return 'bg-danger-50 text-danger-700 ring-danger-200/60 dark:bg-danger-950 dark:text-danger-400 dark:ring-danger-800/40'
  return 'bg-warning-50 text-warning-700 ring-warning-200/60 dark:bg-warning-950 dark:text-warning-400 dark:ring-warning-800/40'
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <!-- ─── Loading skeleton ─── -->
    <div v-if="fetchStatus === 'pending'">
      <div class="mb-10">
        <div class="h-8 w-48 bg-surface-200 dark:bg-surface-700 rounded-lg animate-pulse mb-2" />
        <div class="h-4 w-64 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div v-for="i in 4" :key="i" class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 animate-pulse">
          <div class="flex items-center justify-between mb-4">
            <div class="h-3 w-20 bg-surface-200 dark:bg-surface-700 rounded" />
            <div class="size-9 bg-surface-200 dark:bg-surface-700 rounded-xl" />
          </div>
          <div class="h-9 w-14 bg-surface-200 dark:bg-surface-700 rounded mb-2" />
          <div class="h-3 w-24 bg-surface-100 dark:bg-surface-800 rounded" />
        </div>
      </div>
      <div class="space-y-6">
        <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 animate-pulse">
          <div class="h-5 w-40 bg-surface-200 dark:bg-surface-700 rounded mb-6" />
          <div class="h-24 bg-surface-100 dark:bg-surface-800 rounded-xl" />
        </div>
        <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 animate-pulse">
          <div class="h-5 w-32 bg-surface-200 dark:bg-surface-700 rounded mb-6" />
          <div class="space-y-3">
            <div v-for="i in 3" :key="i" class="h-12 bg-surface-100 dark:bg-surface-800 rounded-xl" />
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Error ─── -->
    <div
      v-else-if="error"
      class="rounded-2xl border border-danger-200 dark:border-danger-900 bg-danger-50 dark:bg-danger-950/60 p-5 text-sm text-danger-700 dark:text-danger-400 flex items-center gap-3"
    >
      <AlertCircle class="size-5 shrink-0" />
      <span>Failed to load AI analysis data.</span>
      <button class="underline ml-auto font-medium cursor-pointer" @click="refresh()">Retry</button>
    </div>

    <!-- ─── Empty state (no runs at all) ─── -->
    <div v-else-if="summary.totalRuns === 0" class="flex flex-col items-center justify-center py-24">
      <div class="rounded-3xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-14 text-center max-w-md shadow-sm">
        <div class="mx-auto mb-8 flex items-center justify-center size-18 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-lg shadow-brand-500/20">
          <Brain class="size-9 text-white" />
        </div>
        <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-3 tracking-tight">
          No AI analysis yet
        </h2>
        <p class="text-sm text-surface-500 dark:text-surface-400 mb-4 leading-relaxed max-w-sm mx-auto">
          Configure your AI provider in Settings and set up scoring criteria on a job to start analyzing candidates.
        </p>
      </div>
    </div>

    <!-- ─── Dashboard content ─── -->
    <template v-else>
      <!-- ─── Header ─── -->
      <div class="flex items-center justify-between mb-10">
        <div>
          <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">AI Analysis</h1>
          <p class="text-sm text-surface-400 dark:text-surface-500 mt-1">Overview of AI scoring runs and token usage</p>
        </div>
      </div>

      <!-- ─── Stat cards ─── -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <!-- Total Runs -->
        <div class="group relative rounded-2xl bg-white dark:bg-surface-900 p-5 sm:p-6 overflow-hidden isolate ring-1 ring-surface-950/[0.04] dark:ring-white/[0.06] hover:ring-brand-500/25 dark:hover:ring-brand-400/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/[0.08]">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Activity class="absolute -bottom-3 -right-3 size-24 text-brand-500/[0.03] dark:text-brand-400/[0.05] rotate-12 transition-transform duration-700 ease-out group-hover:rotate-3 group-hover:scale-110 pointer-events-none" />
          <div class="relative">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black tracking-tight text-surface-900 dark:text-surface-50 tabular-nums leading-none transition-colors duration-300 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                {{ formatNumber(summary.totalRuns) }}
              </span>
              <span class="size-1.5 rounded-full bg-brand-500 shrink-0 mb-1" />
            </div>
            <span class="block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500">Total Runs</span>
            <div class="mt-1 flex items-center gap-3 text-[11px]">
              <span class="flex items-center gap-1 text-success-600 dark:text-success-400">
                <CheckCircle2 class="size-3" />
                {{ summary.completedRuns }}
              </span>
              <span v-if="summary.failedRuns > 0" class="flex items-center gap-1 text-danger-600 dark:text-danger-400">
                <XCircle class="size-3" />
                {{ summary.failedRuns }}
              </span>
            </div>
          </div>
        </div>

        <!-- Success Rate -->
        <div class="group relative rounded-2xl bg-white dark:bg-surface-900 p-5 sm:p-6 overflow-hidden isolate ring-1 ring-surface-950/[0.04] dark:ring-white/[0.06] hover:ring-success-500/25 dark:hover:ring-success-400/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-success-500/[0.08]">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-success-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <TrendingUp class="absolute -bottom-3 -right-3 size-24 text-success-500/[0.03] dark:text-success-400/[0.05] rotate-12 transition-transform duration-700 ease-out group-hover:rotate-3 group-hover:scale-110 pointer-events-none" />
          <div class="relative">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black tracking-tight tabular-nums leading-none transition-colors duration-300" :class="successRate >= 90 ? 'text-success-600 dark:text-success-400' : successRate >= 70 ? 'text-warning-600 dark:text-warning-400' : 'text-danger-600 dark:text-danger-400'">
                {{ successRate }}%
              </span>
              <span class="size-1.5 rounded-full shrink-0 mb-1" :class="successRate >= 90 ? 'bg-success-500' : successRate >= 70 ? 'bg-warning-500' : 'bg-danger-500'" />
            </div>
            <span class="block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500">Success Rate</span>
            <p class="text-[11px] text-surface-300 dark:text-surface-600 mt-1">
              {{ summary.completedRuns }} of {{ summary.totalRuns }} successful
            </p>
          </div>
        </div>

        <!-- Prompt Tokens -->
        <div class="group relative rounded-2xl bg-white dark:bg-surface-900 p-5 sm:p-6 overflow-hidden isolate ring-1 ring-surface-950/[0.04] dark:ring-white/[0.06] hover:ring-violet-500/25 dark:hover:ring-violet-400/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/[0.08]">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Zap class="absolute -bottom-3 -right-3 size-24 text-violet-500/[0.03] dark:text-violet-400/[0.05] rotate-12 transition-transform duration-700 ease-out group-hover:rotate-3 group-hover:scale-110 pointer-events-none" />
          <div class="relative">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black tracking-tight text-surface-900 dark:text-surface-50 tabular-nums leading-none transition-colors duration-300 group-hover:text-violet-600 dark:group-hover:text-violet-400">
                {{ formatNumber(summary.totalPromptTokens) }}
              </span>
              <span class="size-1.5 rounded-full bg-violet-500 shrink-0 mb-1" />
            </div>
            <span class="block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500">Prompt Tokens</span>
            <p class="text-[11px] text-surface-300 dark:text-surface-600 mt-1">Input tokens sent</p>
          </div>
        </div>

        <!-- Completion Tokens -->
        <div class="group relative rounded-2xl bg-white dark:bg-surface-900 p-5 sm:p-6 overflow-hidden isolate ring-1 ring-surface-950/[0.04] dark:ring-white/[0.06] hover:ring-amber-500/25 dark:hover:ring-amber-400/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/[0.08]">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Sparkles class="absolute -bottom-3 -right-3 size-24 text-amber-500/[0.03] dark:text-amber-400/[0.05] rotate-12 transition-transform duration-700 ease-out group-hover:rotate-3 group-hover:scale-110 pointer-events-none" />
          <div class="relative">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black tracking-tight text-surface-900 dark:text-surface-50 tabular-nums leading-none transition-colors duration-300 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                {{ formatNumber(summary.totalCompletionTokens) }}
              </span>
              <span class="size-1.5 rounded-full bg-amber-500 shrink-0 mb-1" />
            </div>
            <span class="block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500">Completion Tokens</span>
            <p class="text-[11px] text-surface-300 dark:text-surface-600 mt-1">Output tokens generated</p>
          </div>
        </div>

        <!-- Total Cost -->
        <div class="group relative rounded-2xl bg-white dark:bg-surface-900 p-5 sm:p-6 overflow-hidden isolate ring-1 ring-surface-950/[0.04] dark:ring-white/[0.06] hover:ring-emerald-500/25 dark:hover:ring-emerald-400/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/[0.08] col-span-2 lg:col-span-1">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <DollarSign class="absolute -bottom-3 -right-3 size-24 text-emerald-500/[0.03] dark:text-emerald-400/[0.05] rotate-12 transition-transform duration-700 ease-out group-hover:rotate-3 group-hover:scale-110 pointer-events-none" />
          <div class="relative">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl sm:text-4xl font-black tracking-tight tabular-nums leading-none transition-colors duration-300" :class="pricing.configured ? 'text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300' : 'text-surface-300 dark:text-surface-600'">
                {{ pricing.configured ? formatCost(totalCost) : '—' }}
              </span>
              <span class="size-1.5 rounded-full shrink-0 mb-1" :class="pricing.configured ? 'bg-emerald-500' : 'bg-surface-300 dark:bg-surface-600'" />
            </div>
            <span class="block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500">Total Cost</span>
            <p class="text-[11px] text-surface-300 dark:text-surface-600 mt-1">
              <template v-if="pricing.configured">Estimated from token usage</template>
              <template v-else>
                <NuxtLink to="/dashboard/settings/ai" class="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 underline underline-offset-2">Set pricing</NuxtLink> to track costs
              </template>
            </p>
          </div>
        </div>
      </div>

      <!-- ─── Usage chart (last 30 days) ─── -->
      <div v-if="dailyRuns.length > 0" class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden mb-6">
        <div class="px-6 py-5 border-b border-surface-200 dark:border-surface-800">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center size-10 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
              <BarChart3 class="size-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Usage — Last 30 Days</h2>
              <p class="text-sm text-surface-500 dark:text-surface-400">Daily run counts and token consumption</p>
            </div>
          </div>
        </div>

        <div class="px-6 py-5 space-y-6">
          <!-- Runs per day bar chart -->
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-3">Runs per Day</h3>
            <div class="flex items-end gap-1 h-24">
              <div
                v-for="day in dailyRuns"
                :key="day.date"
                class="group relative flex-1 min-w-0 h-full flex items-end"
              >
                <div
                  class="w-full rounded-t bg-brand-500 dark:bg-brand-400 transition-all duration-200 hover:bg-brand-600 dark:hover:bg-brand-300"
                  :style="{ height: `${Math.max((day.count / maxDailyCount) * 100, 4)}%` }"
                />
                <!-- Tooltip -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10">
                  <div class="rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 shadow-lg dark:border-surface-700 dark:bg-surface-800 whitespace-nowrap text-[11px]">
                    <p class="font-semibold text-surface-800 dark:text-surface-200">{{ formatDate(day.date) }}</p>
                    <p class="text-surface-500">{{ day.count }} run{{ day.count !== 1 ? 's' : '' }}</p>
                    <p class="text-surface-400">{{ formatNumber(day.promptTokens + day.completionTokens) }} tokens</p>
                    <p v-if="pricing.configured" class="text-emerald-600 dark:text-emerald-400 font-medium">{{ formatCostPrecise(calcCost(day.promptTokens, day.completionTokens)) }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex justify-between mt-1.5 text-[10px] text-surface-400">
              <span>{{ chartStartDate }}</span>
              <span>{{ chartEndDate }}</span>
            </div>
          </div>

          <!-- Tokens per day bar chart -->
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-3">Tokens per Day</h3>
            <div class="flex items-end gap-1 h-24">
              <div
                v-for="day in dailyRuns"
                :key="`tokens-${day.date}`"
                class="group relative flex-1 min-w-0 h-full flex items-end"
              >
                <div class="w-full flex flex-col-reverse rounded-t overflow-hidden" :style="{ height: `${Math.max(((day.promptTokens + day.completionTokens) / maxDailyTokens) * 100, 4)}%` }">
                  <div
                    class="w-full bg-violet-500 dark:bg-violet-400"
                    :style="{ height: `${(day.promptTokens / (day.promptTokens + day.completionTokens || 1)) * 100}%` }"
                  />
                  <div
                    class="w-full bg-amber-400 dark:bg-amber-300"
                    :style="{ height: `${(day.completionTokens / (day.promptTokens + day.completionTokens || 1)) * 100}%` }"
                  />
                </div>
                <!-- Tooltip -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10">
                  <div class="rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 shadow-lg dark:border-surface-700 dark:bg-surface-800 whitespace-nowrap text-[11px]">
                    <p class="font-semibold text-surface-800 dark:text-surface-200">{{ formatDate(day.date) }}</p>
                    <p class="text-violet-600 dark:text-violet-400">Prompt: {{ formatNumber(day.promptTokens) }}</p>
                    <p class="text-amber-600 dark:text-amber-400">Completion: {{ formatNumber(day.completionTokens) }}</p>
                    <p v-if="pricing.configured" class="text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 pt-0.5 border-t border-surface-100 dark:border-surface-700">{{ formatCostPrecise(calcCost(day.promptTokens, day.completionTokens)) }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between mt-1.5">
              <div class="flex items-center gap-3 text-[10px] text-surface-400">
                <span class="flex items-center gap-1"><span class="inline-block size-2 rounded-sm bg-violet-500 dark:bg-violet-400" /> Prompt</span>
                <span class="flex items-center gap-1"><span class="inline-block size-2 rounded-sm bg-amber-400 dark:bg-amber-300" /> Completion</span>
              </div>
              <div class="flex gap-4 text-[10px] text-surface-400">
                <span>{{ chartStartDate }}</span>
                <span>{{ chartEndDate }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Model breakdown ─── -->
      <div v-if="modelBreakdown.length > 0" class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden mb-6">
        <div class="px-6 py-5 border-b border-surface-200 dark:border-surface-800">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center size-10 rounded-lg bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
              <Sparkles class="size-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Model Breakdown</h2>
              <p class="text-sm text-surface-500 dark:text-surface-400">Usage per AI provider and model</p>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800">
                <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">Provider</th>
                <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">Model</th>
                <th class="text-right px-4 py-3 font-medium text-surface-500 dark:text-surface-400">Runs</th>
                <th class="text-right px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden md:table-cell">Prompt</th>
                <th class="text-right px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden md:table-cell">Completion</th>
                <th class="text-right px-4 py-3 font-medium text-surface-500 dark:text-surface-400">Total Tokens</th>
                <th v-if="pricing.configured" class="text-right px-4 py-3 font-medium text-surface-500 dark:text-surface-400">Cost</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
              <tr
                v-for="m in modelBreakdown"
                :key="`${m.provider}-${m.model}`"
                class="bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors"
              >
                <td class="px-4 py-3 font-medium text-surface-700 dark:text-surface-300 capitalize">{{ m.provider }}</td>
                <td class="px-4 py-3">
                  <code class="rounded bg-surface-100 px-1.5 py-0.5 text-xs font-mono text-surface-700 dark:bg-surface-800 dark:text-surface-300">{{ m.model }}</code>
                </td>
                <td class="px-4 py-3 text-right tabular-nums text-surface-700 dark:text-surface-300">{{ m.runCount }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-violet-600 dark:text-violet-400 hidden md:table-cell">{{ formatNumber(m.totalPromptTokens) }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-amber-600 dark:text-amber-400 hidden md:table-cell">{{ formatNumber(m.totalCompletionTokens) }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-semibold text-surface-800 dark:text-surface-200">{{ formatNumber(m.totalTokens) }}</td>
                <td v-if="pricing.configured" class="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{{ formatCost(calcCost(m.totalPromptTokens, m.totalCompletionTokens)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ─── Recent runs ─── -->
      <div class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
        <div class="px-6 py-5 border-b border-surface-200 dark:border-surface-800">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center size-10 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
              <Clock class="size-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Recent Runs</h2>
              <p class="text-sm text-surface-500 dark:text-surface-400">Latest AI scoring activity</p>
            </div>
          </div>
        </div>

        <div v-if="recentRuns.length === 0" class="p-16 text-center">
          <Brain class="size-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
          <h3 class="text-base font-semibold text-surface-700 dark:text-surface-200 mb-1">No AI analysis runs yet</h3>
          <p class="text-sm text-surface-500 dark:text-surface-400">
            Runs will appear here once you score candidates.
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800">
                <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">Status</th>
                <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400">Candidate</th>
                <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden lg:table-cell">Job</th>
                <th class="text-right px-4 py-3 font-medium text-surface-500 dark:text-surface-400">Score</th>
                <th class="text-left px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden md:table-cell">Model</th>
                <th class="text-right px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden md:table-cell">Tokens</th>
                <th v-if="pricing.configured" class="text-right px-4 py-3 font-medium text-surface-500 dark:text-surface-400 hidden md:table-cell">Cost</th>
                <th class="text-right px-4 py-3 font-medium text-surface-500 dark:text-surface-400">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
              <tr
                v-for="run in recentRuns"
                :key="run.id"
                class="bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors"
              >
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize whitespace-nowrap"
                    :class="statusBadgeClass(run.status)"
                  >
                    <span
                      class="size-1.5 rounded-full"
                      :class="run.status === 'completed' ? 'bg-success-500' : run.status === 'failed' ? 'bg-danger-500' : 'bg-warning-500'"
                    />
                    {{ run.status }}
                  </span>
                </td>
                <td class="px-4 py-3 font-semibold text-surface-900 dark:text-surface-100 max-w-[160px] truncate">
                  {{ run.candidateName }}
                </td>
                <td class="px-4 py-3 text-surface-500 dark:text-surface-400 max-w-[160px] truncate hidden lg:table-cell">
                  {{ run.jobTitle }}
                </td>
                <td class="px-4 py-3 text-right">
                  <span
                    v-if="run.compositeScore != null"
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset"
                    :class="scoreBadgeClass(run.compositeScore)"
                  >
                    {{ run.compositeScore }}
                  </span>
                  <span v-else class="text-surface-400">—</span>
                </td>
                <td class="px-4 py-3 hidden md:table-cell">
                  <code class="rounded bg-surface-100 px-1.5 py-0.5 text-[11px] font-mono text-surface-600 dark:bg-surface-800 dark:text-surface-400">{{ run.model }}</code>
                </td>
                <td class="px-4 py-3 text-right tabular-nums text-surface-600 dark:text-surface-400 hidden md:table-cell">
                  <span v-if="run.promptTokens != null">
                    {{ formatNumber((run.promptTokens ?? 0) + (run.completionTokens ?? 0)) }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td v-if="pricing.configured" class="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400 hidden md:table-cell">
                  <span v-if="run.promptTokens != null">{{ formatCostPrecise(calcCost(run.promptTokens ?? 0, run.completionTokens ?? 0)) }}</span>
                  <span v-else>—</span>
                </td>
                <td class="px-4 py-3 text-right text-xs text-surface-500 dark:text-surface-400 whitespace-nowrap">
                  {{ formatDateTime(run.createdAt) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
