import type { PostHog } from 'posthog-js'

export type ToastType = 'error' | 'success' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  details?: string
  link?: { label: string; href: string }
  duration?: number
}

const GITHUB_ISSUES_URL = 'https://github.com/reqcore-inc/reqcore/issues/new'

function getPostHog(): PostHog | undefined {
  try {
    const $ph = (useNuxtApp() as Record<string, unknown>).$posthog as (() => PostHog) | undefined
    return $ph?.()
  } catch {
    return undefined
  }
}

let counter = 0

export function useToast() {
  const toasts = useState<Toast[]>('app-toasts', () => [])

  function add(toast: Omit<Toast, 'id'>) {
    const id = `toast-${++counter}-${Date.now()}`
    const entry: Toast = { id, ...toast }
    toasts.value.push(entry)

    const duration = toast.duration ?? (toast.type === 'error' ? 8000 : 4000)
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }

    return id
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function clear() {
    toasts.value = []
  }

  /**
   * Show an error toast with a link to report the issue on GitHub.
   * Also tracks the error in PostHog if the user has consented.
   */
  function error(title: string, opts?: { message?: string; details?: string; statusCode?: number; path?: string }) {
    if (import.meta.client) {
      const ph = getPostHog()
      if (ph?.has_opted_in_capturing()) {
        ph.capture('app_error', {
          error_title: title,
          error_message: opts?.message,
          error_status_code: opts?.statusCode,
          path: opts?.path ?? window.location.pathname,
        })
      }
    }

    return add({
      type: 'error',
      title,
      message: opts?.message,
      details: opts?.details,
      link: {
        label: 'Report issue',
        href: GITHUB_ISSUES_URL,
      },
    })
  }

  function success(title: string, message?: string) {
    return add({ type: 'success', title, message })
  }

  function warning(title: string, message?: string) {
    return add({ type: 'warning', title, message })
  }

  function info(title: string, message?: string) {
    return add({ type: 'info', title, message })
  }

  return { toasts: readonly(toasts), add, remove, clear, error, success, warning, info }
}
