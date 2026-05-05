<script setup lang="ts">
import {
  ArrowLeft, Save, Eye, EyeOff, Copy, Trash2, Lock,
  FileText, Mail, AlertCircle,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const localePath = useLocalePath()
const templateId = route.params.id as string
const { handlePreviewReadOnlyError } = usePreviewReadOnly()

const isSystemTemplate = computed(() => templateId.startsWith('system-'))

// â”€â”€â”€ System template lookup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const systemTemplate = computed(() =>
  SYSTEM_TEMPLATES.find(t => t.id === templateId),
)

// â”€â”€â”€ Custom template loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { templates, updateTemplate, deleteTemplate, createTemplate } = useEmailTemplates()

const customTemplate = computed(() =>
  templates.value?.find(t => t.id === templateId),
)

const notFound = computed(() => {
  if (isSystemTemplate.value) return !systemTemplate.value
  return templates.value !== null && !customTemplate.value
})

// â”€â”€â”€ Form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const form = reactive({
  name: '',
  subject: '',
  body: '',
})

const hasLoaded = ref(false)
const isDirty = computed(() => {
  if (!hasLoaded.value) return false
  const source = isSystemTemplate.value ? systemTemplate.value : customTemplate.value
  if (!source) return false
  return form.name !== source.name || form.subject !== source.subject || form.body !== source.body
})

// Initialize form from template data
watchEffect(() => {
  const source = isSystemTemplate.value ? systemTemplate.value : customTemplate.value
  if (source && !hasLoaded.value) {
    form.name = source.name
    form.subject = source.subject
    form.body = source.body
    hasLoaded.value = true
  }
})

// â”€â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const isSaving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function handleSave() {
  if (isSystemTemplate.value) return
  saveError.value = ''
  if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
    saveError.value = 'All fields are required'
    return
  }

  isSaving.value = true
  try {
    await updateTemplate(templateId, {
      name: form.name.trim(),
      subject: form.subject.trim(),
      body: form.body.trim(),
    })
    saveSuccess.value = true
    hasLoaded.value = false // Re-sync
    setTimeout(() => { saveSuccess.value = false }, 2000)
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    saveError.value = err?.data?.statusMessage ?? 'Failed to save template'
  } finally {
    isSaving.value = false
  }
}

// â”€â”€â”€ Duplicate system template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const isDuplicating = ref(false)

async function handleDuplicate() {
  isDuplicating.value = true
  try {
    const created = await createTemplate({
      name: `${form.name} (Copy)`,
      subject: form.subject,
      body: form.body,
    })
    await navigateTo(localePath(`/dashboard/interviews/templates/${(created as any).id}`))
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    saveError.value = err?.data?.statusMessage ?? 'Failed to duplicate template'
  } finally {
    isDuplicating.value = false
  }
}

// â”€â”€â”€ Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const isDeleting = ref(false)

async function handleDelete() {
  if (isSystemTemplate.value) return
  isDeleting.value = true
  try {
    await deleteTemplate(templateId)
    await navigateTo(localePath('/dashboard/interviews/templates'))
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    saveError.value = err?.data?.statusMessage ?? 'Failed to delete template'
  } finally {
    isDeleting.value = false
  }
}

// â”€â”€â”€ Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const showPreview = ref(false)

const sampleVariables: Record<string, string> = {
  candidateName: 'Alex Johnson',
  candidateFirstName: 'Alex',
  candidateLastName: 'Johnson',
  candidateEmail: 'alex@example.com',
  jobTitle: 'Senior Frontend Engineer',
  interviewTitle: 'Technical Interview â€” Round 2',
  interviewDate: 'Monday, March 16, 2026',
  interviewTime: '2:00 PM',
  interviewDuration: '60',
  interviewType: 'Video Call',
  interviewLocation: 'https://meet.google.com/abc-defg-hij',
  interviewers: 'Sarah Chen, Michael Park',
  organizationName: 'Acme Corp',
}

const previewSubject = computed(() => renderTemplatePreview(form.subject, sampleVariables))
const previewBody = computed(() => renderTemplatePreview(form.body, sampleVariables))

useSeoMeta({
  title: computed(() => form.name ? `${form.name} â€” Email Templates â€” WWMate` : 'Email Template â€” WWMate'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-8">
    <!-- Breadcrumb -->
    <NuxtLink
      :to="localePath('/dashboard/interviews/templates')"
      class="mb-6 inline-flex items-center gap-1 rounded-full border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-3 py-1.5 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors no-underline"
    >
      <ArrowLeft class="size-4" />
      All Templates
    </NuxtLink>

    <!-- Not found -->
    <div v-if="notFound" class="rounded-xl border border-danger-200 bg-danger-50 p-8 text-center dark:border-danger-800/60 dark:bg-danger-950/40">
      <p class="text-sm text-danger-700 dark:text-danger-300 mb-2 font-semibold">Template not found</p>
      <p class="text-xs text-danger-600 dark:text-danger-400 mb-4">This template may have been deleted or doesn't exist.</p>
      <NuxtLink
        :to="localePath('/dashboard/interviews/templates')"
        class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-all no-underline"
      >
        Back to Templates
      </NuxtLink>
    </div>

    <!-- Template editor -->
    <template v-else-if="hasLoaded">
      <!-- Page header -->
      <div class="mb-6 flex items-start justify-between gap-4">
        <div class="flex items-start gap-3 min-w-0">
          <div
            class="flex size-11 shrink-0 items-center justify-center rounded-xl"
            :class="isSystemTemplate
              ? 'bg-gradient-to-br from-brand-400 to-brand-600 shadow-sm shadow-brand-500/20'
              : 'bg-gradient-to-br from-surface-200 to-surface-300 dark:from-surface-700 dark:to-surface-600'"
          >
            <FileText class="size-5 text-white" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2.5 flex-wrap">
              <h1 class="text-xl font-bold text-surface-900 dark:text-surface-50 truncate tracking-tight">
                {{ form.name }}
              </h1>
              <span
                v-if="isSystemTemplate"
                class="inline-flex items-center gap-1 rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-surface-400"
              >
                <Lock class="size-2.5" />
                Built-in
              </span>
            </div>
            <p v-if="isSystemTemplate && systemTemplate" class="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              {{ systemTemplate.description }}
            </p>
          </div>
        </div>

        <!-- Header actions -->
        <div class="flex items-center gap-2 shrink-0">
          <button
            class="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-surface-200 dark:border-surface-700 px-3.5 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all"
            @click="showPreview = !showPreview"
          >
            <component :is="showPreview ? EyeOff : Eye" class="size-4" />
            {{ showPreview ? 'Hide Preview' : 'Preview' }}
          </button>
          <button
            v-if="isSystemTemplate"
            :disabled="isDuplicating"
            class="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            @click="handleDuplicate"
          >
            <Copy class="size-4" />
            {{ isDuplicating ? 'Duplicatingâ€¦' : 'Duplicate as Custom' }}
          </button>
          <template v-else>
            <button
              :disabled="!isDirty || isSaving"
              class="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              @click="handleSave"
            >
              <Save class="size-4" />
              {{ isSaving ? 'Savingâ€¦' : saveSuccess ? 'Saved!' : 'Save Changes' }}
            </button>
          </template>
        </div>
      </div>

      <!-- Error -->
      <div v-if="saveError" class="mb-6 flex items-start gap-2.5 rounded-xl border border-danger-200/80 bg-danger-50 p-4 text-sm text-danger-700 dark:border-danger-800/60 dark:bg-danger-950/40 dark:text-danger-300">
        <AlertCircle class="size-4 shrink-0 mt-0.5" />
        {{ saveError }}
      </div>

      <div class="grid gap-6" :class="showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-[1fr_320px]'">
        <!-- Editor panel -->
        <div class="space-y-5">
          <!-- Name -->
          <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
            <label for="template-name" class="block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
              Template Name
            </label>
            <input
              id="template-name"
              v-model="form.name"
              type="text"
              :disabled="isSystemTemplate"
              placeholder="e.g., Welcome Interview"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3.5 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <!-- Subject -->
          <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
            <label for="template-subject" class="block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
              Subject Line
            </label>
            <input
              id="template-subject"
              v-model="form.subject"
              type="text"
              :disabled="isSystemTemplate"
              placeholder="e.g., Interview Invitation: {{jobTitle}}"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3.5 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-mono text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <!-- Body -->
          <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
            <label for="template-body" class="block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
              Email Body
            </label>
            <textarea
              id="template-body"
              v-model="form.body"
              :disabled="isSystemTemplate"
              rows="18"
              placeholder="Write your invitation email here. Use {{variables}} for dynamic contentâ€¦"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3.5 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all resize-none font-mono text-[13px] leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <!-- Delete zone (custom templates only) -->
          <div v-if="!isSystemTemplate" class="rounded-xl border border-danger-200/60 dark:border-danger-900/40 bg-danger-50/30 dark:bg-danger-950/20 p-5">
            <h3 class="text-sm font-semibold text-danger-700 dark:text-danger-400 mb-1">Danger Zone</h3>
            <p class="text-xs text-danger-600/80 dark:text-danger-400/60 mb-3">Permanently delete this template. This action cannot be undone.</p>
            <button
              :disabled="isDeleting"
              class="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-danger-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="handleDelete"
            >
              <Trash2 class="size-3.5" />
              {{ isDeleting ? 'Deletingâ€¦' : 'Delete Template' }}
            </button>
          </div>
        </div>

        <!-- Right panel: Preview or Variable reference -->
        <div class="space-y-5">
          <!-- Live preview (when toggled) -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-2"
          >
            <div v-if="showPreview" class="rounded-xl border border-brand-200 dark:border-brand-800/60 bg-white dark:bg-surface-900 overflow-hidden">
              <div class="border-b border-brand-100 dark:border-brand-900/40 bg-brand-50/50 dark:bg-brand-950/20 px-5 py-3">
                <div class="flex items-center gap-2">
                  <Mail class="size-4 text-brand-500 dark:text-brand-400" />
                  <span class="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">Live Preview</span>
                </div>
              </div>
              <div class="p-5 space-y-4">
                <div>
                  <span class="text-[10px] uppercase tracking-wider font-semibold text-surface-400 block mb-1">Subject</span>
                  <p class="text-sm font-semibold text-surface-800 dark:text-surface-200">{{ previewSubject }}</p>
                </div>
                <div class="border-t border-surface-100 dark:border-surface-800 pt-4">
                  <span class="text-[10px] uppercase tracking-wider font-semibold text-surface-400 block mb-2">Body</span>
                  <div class="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap leading-relaxed">{{ previewBody }}</div>
                </div>
              </div>
              <div class="border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-950/30 px-5 py-2.5">
                <p class="text-[11px] text-surface-400 dark:text-surface-500 italic">
                  Preview uses sample data. Actual values are populated when sending.
                </p>
              </div>
            </div>
          </Transition>

          <!-- Variable reference -->
          <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-3">
              Available Variables
            </h3>
            <p class="text-xs text-surface-400 dark:text-surface-500 mb-3">
              Use these placeholders in your subject and body. They'll be replaced with real data when the email is sent.
            </p>
            <div class="space-y-1.5">
              <div
                v-for="v in AVAILABLE_VARIABLES"
                :key="v.key"
                class="flex items-center justify-between rounded-lg bg-surface-50 dark:bg-surface-800/50 px-3 py-2"
              >
                <code class="text-[11px] font-mono text-brand-700 dark:text-brand-300 select-all">{{ v.key }}</code>
                <span class="text-[11px] text-surface-400 dark:text-surface-500">{{ v.desc }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Loading -->
    <div v-else class="flex items-center justify-center py-20">
      <div class="size-8 rounded-full border-2 border-brand-200 border-t-brand-600 dark:border-brand-800 dark:border-t-brand-400 animate-spin" />
    </div>
  </div>
</template>

