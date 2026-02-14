<script setup lang="ts">
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-vue-next'

const props = defineProps<{
  jobId: string
}>()

const { questions, status, addQuestion, updateQuestion, deleteQuestion, reorderQuestions } =
  useJobQuestions(props.jobId)

// ─────────────────────────────────────────────
// Add / Edit state
// ─────────────────────────────────────────────

const showAddForm = ref(false)
const editingQuestion = ref<{
  id: string
  label: string
  type: string
  description?: string | null
  required: boolean
  options?: string[] | null
} | null>(null)

const isSubmitting = ref(false)
const actionError = ref<string | null>(null)

async function handleAdd(data: {
  label: string
  type: string
  description?: string
  required: boolean
  options?: string[]
}) {
  isSubmitting.value = true
  actionError.value = null
  try {
    // Set displayOrder to the end of the list
    await addQuestion({
      ...data,
      displayOrder: (questions.value?.length ?? 0),
    })
    showAddForm.value = false
  } catch (err: any) {
    actionError.value = err.data?.statusMessage ?? 'Failed to add question'
  } finally {
    isSubmitting.value = false
  }
}

async function handleUpdate(data: {
  label: string
  type: string
  description?: string
  required: boolean
  options?: string[]
}) {
  if (!editingQuestion.value) return
  isSubmitting.value = true
  actionError.value = null
  try {
    await updateQuestion(editingQuestion.value.id, data)
    editingQuestion.value = null
  } catch (err: any) {
    actionError.value = err.data?.statusMessage ?? 'Failed to update question'
  } finally {
    isSubmitting.value = false
  }
}

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────

const deletingId = ref<string | null>(null)

async function handleDelete(questionId: string) {
  deletingId.value = questionId
  actionError.value = null
  try {
    await deleteQuestion(questionId)
  } catch (err: any) {
    actionError.value = err.data?.statusMessage ?? 'Failed to delete question'
  } finally {
    deletingId.value = null
  }
}

// ─────────────────────────────────────────────
// Reorder
// ─────────────────────────────────────────────

async function moveQuestion(index: number, direction: 'up' | 'down') {
  if (!questions.value) return
  const list = [...questions.value]

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= list.length) return

  // Swap
  ;[list[index], list[targetIndex]] = [list[targetIndex], list[index]]

  // Assign new display orders
  const order = list.map((q: any, i: number) => ({ id: q.id, displayOrder: i }))

  try {
    await reorderQuestions(order)
  } catch (err: any) {
    actionError.value = err.data?.statusMessage ?? 'Failed to reorder questions'
  }
}

// ─────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────

const typeLabels: Record<string, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  single_select: 'Single Select',
  multi_select: 'Multi Select',
  number: 'Number',
  date: 'Date',
  url: 'URL',
  checkbox: 'Checkbox',
}
</script>

<template>
  <div>
    <!-- Error banner -->
    <div
      v-if="actionError"
      class="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 mb-4"
    >
      {{ actionError }}
      <button class="ml-2 underline" @click="actionError = null">Dismiss</button>
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="text-sm text-surface-400 py-4">
      Loading questions…
    </div>

    <!-- Question list -->
    <div v-else-if="questions && questions.length > 0" class="space-y-2 mb-4">
      <div
        v-for="(q, index) in questions"
        :key="q.id"
        class="flex items-center gap-3 rounded-lg border border-surface-200 bg-white p-3 group"
      >
        <!-- Grip / order indicator -->
        <div class="text-surface-300">
          <GripVertical class="size-4" />
        </div>

        <!-- Question info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-surface-900 truncate">{{ q.label }}</span>
            <span v-if="q.required" class="text-xs text-danger-500 font-medium">Required</span>
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs text-surface-400">{{ typeLabels[q.type] ?? q.type }}</span>
            <span v-if="q.description" class="text-xs text-surface-400 truncate">
              — {{ q.description }}
            </span>
            <span
              v-if="(q.type === 'single_select' || q.type === 'multi_select') && q.options"
              class="text-xs text-surface-400"
            >
              · {{ q.options.length }} options
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            :disabled="index === 0"
            class="rounded p-1 text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors disabled:opacity-30"
            title="Move up"
            @click="moveQuestion(index, 'up')"
          >
            <ChevronUp class="size-4" />
          </button>
          <button
            :disabled="index === questions.length - 1"
            class="rounded p-1 text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors disabled:opacity-30"
            title="Move down"
            @click="moveQuestion(index, 'down')"
          >
            <ChevronDown class="size-4" />
          </button>
          <button
            class="rounded p-1 text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
            title="Edit"
            @click="editingQuestion = q; showAddForm = false"
          >
            <Pencil class="size-4" />
          </button>
          <button
            :disabled="deletingId === q.id"
            class="rounded p-1 text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors disabled:opacity-50"
            title="Delete"
            @click="handleDelete(q.id)"
          >
            <Trash2 class="size-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <p v-else class="text-sm text-surface-400 py-4">
      No custom questions yet. Applicants will see only the standard fields (name, email, phone).
    </p>

    <!-- Edit form (inline) -->
    <QuestionForm
      v-if="editingQuestion"
      :question="editingQuestion"
      class="mb-4"
      @save="handleUpdate"
      @cancel="editingQuestion = null"
    />

    <!-- Add form (inline) -->
    <QuestionForm
      v-if="showAddForm && !editingQuestion"
      class="mb-4"
      @save="handleAdd"
      @cancel="showAddForm = false"
    />

    <!-- Add button -->
    <button
      v-if="!showAddForm && !editingQuestion"
      class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-surface-300 px-3 py-2 text-sm font-medium text-surface-600 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
      @click="showAddForm = true"
    >
      <Plus class="size-4" />
      Add Question
    </button>
  </div>
</template>
