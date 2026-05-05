<script setup lang="ts">
import {
  ArrowLeft, Plus, Mail, Trash2, Sparkles, Lock,
  FileText, ChevronRight,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'Email Templates â€” WWMate',
  description: 'Manage interview invitation email templates',
  robots: 'noindex, nofollow',
})

const localePath = useLocalePath()

const { templates, status: fetchStatus, deleteTemplate } = useEmailTemplates()
const { handlePreviewReadOnlyError } = usePreviewReadOnly()

const deletingId = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const templateToDelete = ref<{ id: string; name: string } | null>(null)

function confirmDelete(id: string, name: string) {
  templateToDelete.value = { id, name }
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!templateToDelete.value) return
  deletingId.value = templateToDelete.value.id
  try {
    await deleteTemplate(templateToDelete.value.id)
  } catch (err: any) {
    handlePreviewReadOnlyError(err)
  } finally {
    deletingId.value = null
    showDeleteConfirm.value = false
    templateToDelete.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-8">
    <!-- Back to interviews -->
    <NuxtLink
      :to="localePath('/dashboard/interviews')"
      class="mb-6 inline-flex items-center gap-1 rounded-full border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-3 py-1.5 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors no-underline"
    >
      <ArrowLeft class="size-4" />
      Back to Interviews
    </NuxtLink>

    <!-- Page header -->
    <div class="mb-8 flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-3 mb-2">
          <div class="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm shadow-brand-500/20">
            <Mail class="size-5 text-white" />
          </div>
          <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            Email Templates
          </h1>
        </div>
        <p class="text-sm text-surface-500 dark:text-surface-400 max-w-xl">
          Manage reusable email templates for interview invitations. Use built-in templates or create your own with dynamic variables.
        </p>
      </div>
      <NuxtLink
        :to="localePath('/dashboard/interviews/templates/new')"
        class="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 transition-all no-underline shrink-0"
      >
        <Plus class="size-4" />
        New Template
      </NuxtLink>
    </div>

    <!-- Built-in templates section -->
    <section class="mb-10">
      <div class="flex items-center gap-2 mb-4">
        <Sparkles class="size-4 text-brand-500" />
        <h2 class="text-sm font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
          Built-in Templates
        </h2>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="t in SYSTEM_TEMPLATES"
          :key="t.id"
          :to="localePath(`/dashboard/interviews/templates/${t.id}`)"
          class="group relative rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 transition-all duration-200 hover:border-brand-300 dark:hover:border-brand-800 hover:shadow-lg hover:shadow-brand-500/5 no-underline"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex size-9 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
              <FileText class="size-4 text-brand-600 dark:text-brand-400" />
            </div>
            <span class="inline-flex items-center gap-1 rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-surface-400">
              <Lock class="size-2.5" />
              Built-in
            </span>
          </div>
          <h3 class="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-1 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
            {{ t.name }}
          </h3>
          <p class="text-xs text-surface-500 dark:text-surface-400 line-clamp-2 mb-3">
            {{ t.description }}
          </p>
          <p class="text-[11px] font-mono text-surface-400 dark:text-surface-500 truncate">
            {{ t.subject }}
          </p>
          <ChevronRight class="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-surface-300 dark:text-surface-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </NuxtLink>
      </div>
    </section>

    <!-- Custom templates section -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <FileText class="size-4 text-surface-400" />
          <h2 class="text-sm font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
            Your Templates
          </h2>
          <span
            v-if="templates && templates.length > 0"
            class="ml-1 inline-flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 px-2 py-0.5 text-[11px] font-semibold text-surface-500 dark:text-surface-400"
          >
            {{ templates.length }}
          </span>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="fetchStatus === 'pending'" class="flex items-center gap-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 justify-center">
        <div class="size-5 rounded-full border-2 border-brand-200 border-t-brand-600 dark:border-brand-800 dark:border-t-brand-400 animate-spin" />
        <span class="text-sm text-surface-400">Loading templatesâ€¦</span>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!templates || templates.length === 0"
        class="rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50 p-10 text-center"
      >
        <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
          <Mail class="size-5 text-surface-400" />
        </div>
        <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">
          No custom templates yet
        </h3>
        <p class="text-xs text-surface-400 dark:text-surface-500 mb-4 max-w-sm mx-auto">
          Create your own email templates to match your organization's voice and branding.
        </p>
        <NuxtLink
          :to="localePath('/dashboard/interviews/templates/new')"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-all no-underline"
        >
          <Plus class="size-4" />
          Create Your First Template
        </NuxtLink>
      </div>

      <!-- Template cards -->
      <div v-else class="space-y-3">
        <div
          v-for="t in templates"
          :key="t.id"
          class="group relative rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 transition-all duration-200 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-md hover:shadow-surface-900/5"
        >
          <NuxtLink
            :to="localePath(`/dashboard/interviews/templates/${t.id}`)"
            class="block p-5 pr-24 no-underline"
          >
            <div class="flex items-start gap-4">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-700">
                <FileText class="size-4.5 text-surface-500 dark:text-surface-400" />
              </div>
              <div class="min-w-0">
                <h3 class="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-0.5 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
                  {{ t.name }}
                </h3>
                <p class="text-[11px] font-mono text-surface-400 dark:text-surface-500 truncate mb-1.5">
                  {{ t.subject }}
                </p>
                <p class="text-xs text-surface-400 dark:text-surface-500">
                  Updated {{ new Date(t.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
                </p>
              </div>
            </div>
          </NuxtLink>

          <!-- Actions -->
          <div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              class="cursor-pointer rounded-lg p-2 text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:text-danger-400 dark:hover:bg-danger-950/40 transition-all opacity-0 group-hover:opacity-100"
              title="Delete template"
              @click.stop.prevent="confirmDelete(t.id, t.name)"
            >
              <Trash2 class="size-4" />
            </button>
            <ChevronRight class="size-4 text-surface-300 dark:text-surface-600" />
          </div>
        </div>
      </div>
    </section>

    <!-- Delete confirmation (inline, not modal, using a bottom sheet style) -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div class="absolute inset-0 bg-black/30 backdrop-blur-[2px]" @click="showDeleteConfirm = false" />
          <div class="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl bg-white dark:bg-surface-900 shadow-2xl ring-1 ring-surface-200/80 dark:ring-surface-700/60 p-6">
            <h3 class="text-base font-semibold text-surface-900 dark:text-surface-100 mb-2">Delete Template</h3>
            <p class="text-sm text-surface-600 dark:text-surface-400 mb-5">
              Are you sure you want to delete <strong>{{ templateToDelete?.name }}</strong>? This cannot be undone.
            </p>
            <div class="flex gap-3">
              <button
                class="flex-1 cursor-pointer rounded-xl border border-surface-200 dark:border-surface-700 px-4 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all"
                @click="showDeleteConfirm = false"
              >
                Cancel
              </button>
              <button
                :disabled="deletingId !== null"
                class="flex-1 cursor-pointer rounded-xl bg-danger-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                @click="handleDelete"
              >
                {{ deletingId ? 'Deletingâ€¦' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

