/**
 * Composable for fetching and updating organization localization settings.
 * Provides reactive settings and a utility for formatting candidate names/dates.
 */
export function useOrgSettings() {
  const { data, status, refresh } = useFetch('/api/org-settings', {
    key: 'org-settings',
    headers: useRequestHeaders(['cookie']),
  })

  const nameDisplayFormat = computed(() => data.value?.nameDisplayFormat ?? 'first_last')
  const dateFormat = computed(() => data.value?.dateFormat ?? 'mdy')

  /**
   * Format a candidate's full name according to the org's display preference.
   * Falls back to "First Last" if displayName is not set.
   */
  function formatCandidateName(candidate: {
    firstName?: string | null
    lastName?: string | null
    displayName?: string | null
  }): string {
    if (candidate.displayName?.trim()) return candidate.displayName.trim()
    return formatPersonName(candidate.firstName, candidate.lastName)
  }

  /**
   * Format a person's name from first/last parts according to the org's
   * display preference. Use for shapes that don't carry a `displayName`
   * (e.g. flattened API rows like `candidateFirstName` / `candidateLastName`).
   */
  function formatPersonName(
    firstName: string | null | undefined,
    lastName: string | null | undefined,
    displayName?: string | null
  ): string {
    if (displayName?.trim()) return displayName.trim()
    const first = (firstName ?? '').trim()
    const last = (lastName ?? '').trim()
    if (!first && !last) return ''
    if (!first) return last
    if (!last) return first
    if (nameDisplayFormat.value === 'last_first') {
      return `${last} ${first}`
    }
    return `${first} ${last}`
  }

  /**
   * Format a full ISO timestamp (or Date) according to the org's date format.
   * Returns an empty string for null/undefined values.
   */
  function formatDateTime(value: string | Date | null | undefined): string {
    if (!value) return ''
    const iso = typeof value === 'string' ? value : value.toISOString()
    return formatDate(iso.slice(0, 10))
  }

  /**
   * Format a date string (YYYY-MM-DD) according to the org's date format setting.
   * Returns an empty string for null/undefined values.
   */
  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    if (!year || !month || !day) return dateStr
    switch (dateFormat.value) {
      case 'dmy': return `${day}/${month}/${year}`
      case 'ymd': return `${year}-${month}-${day}`
      case 'mdy':
      default: return `${month}/${day}/${year}`
    }
  }

  async function updateSettings(payload: {
    nameDisplayFormat?: 'first_last' | 'last_first'
    dateFormat?: 'mdy' | 'dmy' | 'ymd'
  }) {
    await $fetch('/api/org-settings', {
      method: 'PATCH',
      body: payload,
    })
    await refresh()
  }

  return {
    nameDisplayFormat,
    dateFormat,
    status,
    formatCandidateName,
    formatPersonName,
    formatDate,
    formatDateTime,
    updateSettings,
    refresh,
  }
}
