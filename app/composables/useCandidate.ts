import type { MaybeRefOrGetter } from 'vue'
import { usePreviewReadOnly } from '~/composables/usePreviewReadOnly'

/**
 * Composable for a single candidate detail with update and delete mutations.
 * Wraps `useFetch('/api/candidates/:id')` with a reactive key.
 */
export function useCandidate(id: MaybeRefOrGetter<string>) {
  const localePath = useLocalePath()
  const { handlePreviewReadOnlyError } = usePreviewReadOnly()
  const candidateId = computed(() => toValue(id))

  const { data: candidate, status, error, refresh } = useFetch(
    () => `/api/candidates/${candidateId.value}`,
    {
      key: computed(() => `candidate-${candidateId.value}`),
      headers: useRequestHeaders(['cookie']),
    },
  )

  /** Update candidate fields (partial) and refresh both detail and list caches */
  async function updateCandidate(payload: Partial<{
    firstName: string
    lastName: string
    displayName: string | null
    email: string
    phone: string | null
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
    dateOfBirth: string | null
  }>) {
    try {
      const updated = await $fetch(`/api/candidates/${candidateId.value}`, {
        method: 'PATCH',
        body: payload,
      })
      await refresh()
      await refreshNuxtData('candidates')
      return updated
    } catch (error) {
      handlePreviewReadOnlyError(error)
      throw error
    }
  }

  /** Delete this candidate and navigate back to the list */
  async function deleteCandidate() {
    try {
      await $fetch(`/api/candidates/${candidateId.value}`, { method: 'DELETE' })
    } catch (error) {
      handlePreviewReadOnlyError(error)
      throw error
    }
    await refreshNuxtData('candidates')
    await navigateTo(localePath('/dashboard/candidates'))
  }

  return { candidate, status, error, refresh, updateCandidate, deleteCandidate }
}
