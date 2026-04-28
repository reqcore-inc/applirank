<script setup lang="ts">
/**
 * ChatbotAgentManagerModal
 *
 * Full CRUD UI for the user's private chatbot agents (system-prompt
 * personas). Two-pane layout:
 *   - Left: agent list with "+ New agent" button.
 *   - Right: form for the currently-edited agent (name, description, icon,
 *     system prompt, temperature, isDefault, save / delete).
 *
 * Validates the prompt length client-side (must match server's
 * CHATBOT_AGENT_PROMPT_MAX). Server is the source of truth — every save
 * is followed by a refresh to pick up isDefault swaps.
 */
import { Plus, Sparkles, Star, Trash2, X, Save } from 'lucide-vue-next'
import {
  CHATBOT_AGENT_MAX_PER_USER,
  CHATBOT_AGENT_PROMPT_MAX,
  type ChatbotAgent,
} from '~~/shared/chatbot'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { agents, createAgent, updateAgent, deleteAgent } = useChatbot()

interface AgentDraft {
  id: string | null
  name: string
  description: string
  icon: string
  systemPrompt: string
  temperature: number | null
  isDefault: boolean
}

const blankDraft = (): AgentDraft => ({
  id: null,
  name: '',
  description: '',
  icon: '',
  systemPrompt: '',
  temperature: null,
  isDefault: false,
})

const draft = ref<AgentDraft>(blankDraft())
const saving = ref(false)

function selectAgent(a: ChatbotAgent) {
  draft.value = {
    id: a.id,
    name: a.name,
    description: a.description ?? '',
    icon: a.icon ?? '',
    systemPrompt: a.systemPrompt,
    temperature: a.temperature ?? null,
    isDefault: a.isDefault,
  }
}

function newAgent() {
  draft.value = blankDraft()
}

const promptTooLong = computed(() => draft.value.systemPrompt.length > CHATBOT_AGENT_PROMPT_MAX)
const canSave = computed(() =>
  !saving.value
  && draft.value.name.trim().length > 0
  && draft.value.systemPrompt.trim().length > 0
  && !promptTooLong.value,
)

async function save() {
  if (!canSave.value) return
  saving.value = true
  try {
    const payload = {
      name: draft.value.name.trim(),
      description: draft.value.description.trim() || null,
      icon: draft.value.icon.trim() || null,
      systemPrompt: draft.value.systemPrompt,
      temperature: draft.value.temperature,
      isDefault: draft.value.isDefault,
    }
    if (draft.value.id) {
      await updateAgent(draft.value.id, payload)
    } else {
      const created = await createAgent(payload)
      if (created) draft.value.id = created.id
    }
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!draft.value.id) return
  if (!confirm(`Delete agent "${draft.value.name}"?`)) return
  await deleteAgent(draft.value.id)
  newAgent()
}

const promptCount = computed(() => `${draft.value.systemPrompt.length} / ${CHATBOT_AGENT_PROMPT_MAX}`)
const atCap = computed(() => agents.value.length >= CHATBOT_AGENT_MAX_PER_USER)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="emit('close')"
    >
      <div class="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-surface-950 shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 px-5 py-3.5">
          <div class="flex items-center gap-2">
            <Sparkles class="size-5 text-brand-500" />
            <h2 class="text-base font-semibold text-surface-900 dark:text-surface-50">
              Manage agents
            </h2>
            <span class="rounded-full bg-surface-100 dark:bg-surface-800 px-2 py-0.5 text-[11px] text-surface-600 dark:text-surface-300">
              {{ agents.length }} / {{ CHATBOT_AGENT_MAX_PER_USER }}
            </span>
          </div>
          <button
            class="inline-flex size-8 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer border-0 bg-transparent"
            @click="emit('close')"
          >
            <X class="size-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="flex flex-1 min-h-0">
          <!-- Agent list -->
          <div class="w-64 shrink-0 overflow-y-auto border-r border-surface-200 dark:border-surface-800 p-3">
            <button
              class="mb-2 inline-flex w-full items-center gap-2 rounded-lg border border-dashed border-brand-300 dark:border-brand-700 px-3 py-2 text-sm font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-transparent transition-colors"
              :disabled="atCap"
              :title="atCap ? 'Agent limit reached' : 'New agent'"
              @click="newAgent"
            >
              <Plus class="size-4" />
              New agent
            </button>
            <ul class="space-y-1">
              <li
                v-for="a in agents"
                :key="a.id"
                class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                :class="draft.id === a.id
                  ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-100'
                  : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800/60'"
                @click="selectAgent(a)"
              >
                <Sparkles class="size-3.5 shrink-0 opacity-60" />
                <span class="flex-1 truncate">{{ a.name }}</span>
                <Star v-if="a.isDefault" class="size-3 shrink-0 text-warning-500" />
              </li>
              <li
                v-if="agents.length === 0"
                class="px-2 py-2 text-xs italic text-surface-400"
              >
                No agents yet — pick "New agent" to get started.
              </li>
            </ul>
          </div>

          <!-- Editor -->
          <div class="flex-1 min-w-0 overflow-y-auto p-5">
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Name
                </label>
                <input
                  v-model="draft.name"
                  type="text"
                  maxlength="80"
                  placeholder="e.g. Recruiter coach"
                  class="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
              </div>

              <div>
                <label class="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Description <span class="font-normal text-surface-400">(optional, shown in the picker)</span>
                </label>
                <input
                  v-model="draft.description"
                  type="text"
                  maxlength="200"
                  placeholder="e.g. Reviews resumes against a job"
                  class="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
              </div>

              <div>
                <label class="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  System prompt
                  <span class="float-right font-normal" :class="promptTooLong ? 'text-danger-500' : 'text-surface-400'">
                    {{ promptCount }}
                  </span>
                </label>
                <textarea
                  v-model="draft.systemPrompt"
                  rows="10"
                  placeholder="Describe how this agent should behave. The default Reqcore tooling instructions are always prepended automatically."
                  class="w-full rounded-lg border bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-1 font-mono"
                  :class="promptTooLong
                    ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500'
                    : 'border-surface-300 dark:border-surface-700 focus:border-brand-500 focus:ring-brand-500'"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Temperature <span class="font-normal text-surface-400">(0–2, blank = default)</span>
                  </label>
                  <input
                    v-model.number="draft.temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    placeholder="—"
                    class="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                </div>
                <div>
                  <label class="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Icon name <span class="font-normal text-surface-400">(lucide, optional)</span>
                  </label>
                  <input
                    v-model="draft.icon"
                    type="text"
                    maxlength="40"
                    placeholder="sparkles"
                    class="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                </div>
              </div>

              <label class="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-200">
                <input
                  v-model="draft.isDefault"
                  type="checkbox"
                  class="size-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                >
                Use this agent by default for new conversations
              </label>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between border-t border-surface-200 dark:border-surface-800 px-5 py-3">
          <button
            v-if="draft.id"
            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 cursor-pointer border-0 bg-transparent"
            @click="remove"
          >
            <Trash2 class="size-4" />
            Delete
          </button>
          <span v-else />

          <div class="flex items-center gap-2">
            <button
              class="rounded-lg px-3 py-2 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer border-0 bg-transparent"
              @click="emit('close')"
            >
              Close
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-colors"
              :disabled="!canSave"
              @click="save"
            >
              <Save class="size-4" />
              {{ draft.id ? 'Save changes' : 'Create agent' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
