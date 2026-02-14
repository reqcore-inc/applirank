import type { MaybeRefOrGetter } from 'vue'

/**
 * Composable for managing custom questions on a job's application form.
 * Wraps the question CRUD endpoints for the recruiter dashboard.
 */
export function useJobQuestions(jobId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(jobId))

  const { data: questions, status, error, refresh } = useFetch(
    () => `/api/jobs/${id.value}/questions`,
    {
      key: computed(() => `job-questions-${id.value}`),
      headers: useRequestHeaders(['cookie']),
      default: () => [] as any[],
    },
  )

  /** Add a new custom question */
  async function addQuestion(payload: {
    label: string
    type?: string
    description?: string
    required?: boolean
    options?: string[]
    displayOrder?: number
  }) {
    const created = await $fetch(`/api/jobs/${id.value}/questions`, {
      method: 'POST',
      body: payload,
    })
    await refresh()
    return created
  }

  /** Update an existing question */
  async function updateQuestion(questionId: string, payload: {
    label?: string
    type?: string
    description?: string | null
    required?: boolean
    options?: string[] | null
    displayOrder?: number
  }) {
    const updated = await $fetch(`/api/jobs/${id.value}/questions/${questionId}`, {
      method: 'PATCH',
      body: payload,
    })
    await refresh()
    return updated
  }

  /** Delete a question by ID */
  async function deleteQuestion(questionId: string) {
    await $fetch(`/api/jobs/${id.value}/questions/${questionId}`, {
      method: 'DELETE',
    })
    await refresh()
  }

  /** Bulk reorder questions */
  async function reorderQuestions(order: { id: string; displayOrder: number }[]) {
    await $fetch(`/api/jobs/${id.value}/questions/reorder`, {
      method: 'PUT',
      body: { order },
    })
    await refresh()
  }

  return {
    questions,
    status,
    error,
    refresh,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
  }
}
