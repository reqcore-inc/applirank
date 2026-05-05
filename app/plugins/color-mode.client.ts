/**
 * Client-only plugin that applies the saved color mode preference
 * before first paint to avoid a flash of wrong theme.
 *
 * Reads from `localStorage` and falls back to OS preference.
 */
export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const stored = localStorage.getItem('WWMate-color-mode') as 'light' | 'dark' | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const shouldBeDark = stored === 'dark' || (!stored && prefersDark)

  if (shouldBeDark) {
    document.documentElement.classList.add('dark')
    document.documentElement.style.colorScheme = 'dark'
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = 'light'
  }
})

