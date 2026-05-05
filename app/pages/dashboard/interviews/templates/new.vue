<script setup lang="ts">
import {
  ArrowLeft, Save, Eye, EyeOff, Mail, AlertCircle, FileText,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: 'New Template â€” Email Templates â€” WWMate',
  description: 'Create a new interview invitation email template',
  robots: 'noindex, nofollow',
})

const localePath = useLocalePath()
const { createTemplate } = useEmailTemplates()
const { handlePreviewReadOnlyError } = usePreviewReadOnly()

// â”€â”€â”€ Form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const form = reactive({
  name: '',
  subject: '',
  body: '',
})

const showPreview = ref(false)
const isSaving = ref(false)
const saveError = ref('')

const canSave = computed(() =>
  form.name.trim().length > 0
  && form.subject.trim().length > 0
  && form.body.trim().length > 0,
)

// â”€â”€â”€ Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleCreate() {
  saveError.value = ''
  if (!canSave.value) {
    saveError.value = 'All fields are required'
    return
  }

  isSaving.value = true
  try {
    const created = await createTemplate({
      name: form.name.trim(),
      subject: form.subject.trim(),
      body: form.body.trim(),
    })
    await navigateTo(localePath(`/dashboard/interviews/templates/${(created as any).id}`))
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    saveError.value = err?.data?.statusMessage ?? 'Failed to create template'
  } finally {
    isSaving.value = false
  }
}
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

    <!-- Page header -->
    <div class="mb-6 flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm shadow-brand-500/20">
          <FileText class="size-5 text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            New Template
          </h1>
          <p class="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
            Create a reusable email template for interview invitations.
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button
          class="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-surface-200 dark:border-surface-700 px-3.5 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all"
          @click="showPreview = !showPreview"
        >
          <component :is="showPreview ? EyeOff : Eye" class="size-4" />
          {{ showPreview ? 'Hide Preview' : 'Preview' }}
        </button>
        <button
          :disabled="!canSave || isSaving"
          class="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          @click="handleCreate"
        >
          <Save class="size-4" />
          {{ isSaving ? 'Creatingâ€¦' : 'Create Template' }}
        </button>
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
            placeholder="e.g., Welcome Interview, Engineering Screen"
            class="w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3.5 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
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
            placeholder="e.g., Interview Invitation: {{jobTitle}} at {{organizationName}}"
            class="w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3.5 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-mono text-[13px]"
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
            rows="18"
            placeholder="Write your invitation email here. Use {{variables}} for dynamic contentâ€¦"
            class="w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3.5 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all resize-none font-mono text-[13px] leading-relaxed"
          />
        </div>
      </div>

      <!-- Right panel -->
      <div class="space-y-5">
        <!-- Live preview -->
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
                <p class="text-sm font-semibold text-surface-800 dark:text-surface-200">
                  {{ previewSubject || 'Enter a subject lineâ€¦' }}
                </p>
              </div>
              <div class="border-t border-surface-100 dark:border-surface-800 pt-4">
                <span class="text-[10px] uppercase tracking-wider font-semibold text-surface-400 block mb-2">Body</span>
                <div class="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap leading-relaxed">
                  {{ previewBody || 'Start writing to see a previewâ€¦' }}
                </div>
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
  </div>
</template>

