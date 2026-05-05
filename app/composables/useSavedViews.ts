/**
 * useSavedViews â€” manages a list of named, customizable filter/sort "views"
 * persisted in localStorage, scoped per page (e.g. "candidates", "applications").
 *
 * Each view stores an arbitrary settings object (filters + sort + visible columns)
 * along with a name and an optional default flag.
 */

export interface SavedView<T = Record<string, unknown>> {
  id: string
  name: string
  isDefault?: boolean
  settings: T
}

const STORAGE_PREFIX = 'WWMate:saved-views:'

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function useSavedViews<T extends Record<string, unknown>>(scope: string, defaultSettings: T) {
  const storageKey = `${STORAGE_PREFIX}${scope}`
  const views = ref([]) as Ref<SavedView<T>[]>
  const activeViewId = ref<string | null>(null)
  const loaded = ref(false)

  function load() {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as SavedView<T>[]
        if (Array.isArray(parsed)) views.value = parsed
      }
    }
    catch {
      // ignore corrupt data
    }
    loaded.value = true
  }

  function persist() {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(views.value))
    }
    catch {
      // ignore quota errors
    }
  }

  function getActive(): SavedView<T> | null {
    if (!activeViewId.value) return null
    return views.value.find(v => v.id === activeViewId.value) ?? null
  }

  function getDefault(): SavedView<T> | null {
    return views.value.find(v => v.isDefault) ?? null
  }

  function applyView(id: string): T | null {
    const view = views.value.find(v => v.id === id)
    if (!view) return null
    activeViewId.value = id
    return { ...defaultSettings, ...view.settings }
  }

  function saveView(name: string, settings: T, opts?: { setActive?: boolean }): SavedView<T> {
    const trimmed = name.trim() || 'Untitled view'
    const view: SavedView<T> = { id: genId(), name: trimmed, settings: { ...settings } }
    views.value = [...views.value, view]
    persist()
    if (opts?.setActive !== false) activeViewId.value = view.id
    return view
  }

  function updateView(id: string, patch: Partial<Pick<SavedView<T>, 'name' | 'settings'>>) {
    views.value = views.value.map(v => v.id === id ? { ...v, ...patch } : v)
    persist()
  }

  function deleteView(id: string) {
    views.value = views.value.filter(v => v.id !== id)
    if (activeViewId.value === id) activeViewId.value = null
    persist()
  }

  function setDefault(id: string | null) {
    views.value = views.value.map(v => ({ ...v, isDefault: v.id === id }))
    persist()
  }

  function clearActive() {
    activeViewId.value = null
  }

  // Auto-load on mount (client only)
  onMounted(() => {
    load()
    // Apply default view if one exists and nothing is active yet
    const def = getDefault()
    if (def && !activeViewId.value) activeViewId.value = def.id
  })

  return {
    views,
    activeViewId,
    loaded,
    getActive,
    getDefault,
    applyView,
    saveView,
    updateView,
    deleteView,
    setDefault,
    clearActive,
  }
}

