/**
 * SSR-safe composable for managing dark/light mode.
 *
 * - Persists preference to `localStorage` under the key `WWMate-color-mode`.
 * - Defaults to OS preference (`prefers-color-scheme: dark`) on first visit.
 * - Manages the `.dark` class on `<html>` via both Nuxt's useHead (so it
 *   survives Unhead's reactive attribute patching) and direct DOM manipulation
 *   for immediate visual feedback.
 *
 * Must be called in `<script setup>` context.
 */
export function useColorMode() {
  const colorMode = useState<'light' | 'dark'>('color-mode', () => 'light')
  const isDark = computed(() => colorMode.value === 'dark')

  // Route the class through Nuxt's head management (Unhead) so that
  // reactive htmlAttrs updates (e.g. locale switches) do not inadvertently
  // strip the .dark class that was set by direct DOM manipulation.
  // The object syntax { dark: bool } lets Unhead add/remove 'dark' precisely.
  useHead(computed(() => ({
    htmlAttrs: {
      class: { dark: isDark.value },
    },
  })))

  function applyClass() {
    if (import.meta.server) return
    // Direct DOM update for immediate visual feedback without waiting for
    // Unhead's next flush cycle.
    document.documentElement.classList.toggle('dark', colorMode.value === 'dark')
    document.documentElement.style.colorScheme = colorMode.value
  }

  // Immediately sync Vue state from the real DOM on the client.
  // The inline script in app.vue applies .dark before Vue loads, so the HTML
  // class is always the source of truth. If useState is still at the server
  // default ('light') but the page is actually dark, we fix that here â€”
  // before any user interaction is possible â€” so the icon and toggle are correct.
  if (import.meta.client) {
    const htmlIsDark = document.documentElement.classList.contains('dark')
    if (htmlIsDark && colorMode.value !== 'dark') colorMode.value = 'dark'
    else if (!htmlIsDark && colorMode.value !== 'light') colorMode.value = 'light'
  }

  /** Toggle between light and dark mode. */
  function toggle() {
    colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
    applyClass()
    if (import.meta.client) {
      localStorage.setItem('WWMate-color-mode', colorMode.value)
    }
  }

  /** Set a specific mode. */
  function set(mode: 'light' | 'dark') {
    colorMode.value = mode
    applyClass()
    if (import.meta.client) {
      localStorage.setItem('WWMate-color-mode', mode)
    }
  }

  // Keep state in sync with localStorage on mount (handles tab switches,
  // storage events from other tabs, etc.)
  if (import.meta.client) {
    onMounted(() => {
      const stored = localStorage.getItem('WWMate-color-mode') as 'light' | 'dark' | null
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const resolved: 'light' | 'dark' = stored ? stored : (prefersDark ? 'dark' : 'light')
      if (colorMode.value !== resolved) {
        colorMode.value = resolved
        applyClass()
      }
    })
  }

  return { colorMode, isDark, toggle, set }
}

