/**
 * Client-side session guard — periodically checks whether the current session
 * is still valid. When the session is detected as expired (e.g. after a demo
 * reseed), sets `sessionExpired` to `true` so the UI can show an overlay.
 *
 * Only activates on the client. On the server it's a no-op.
 */
export function useSessionGuard() {
  const sessionExpired = useState('session-guard-expired', () => false)

  if (import.meta.client) {
    const CHECK_INTERVAL_MS = 10_000

    let timer: ReturnType<typeof setInterval> | undefined

    async function checkSession() {
      try {
        const res = await $fetch<{ session?: unknown } | null>('/api/auth/get-session')
        // Better Auth returns 200 with no session when the session cookie is stale
        if (!res || !res.session) {
          sessionExpired.value = true
          if (timer) clearInterval(timer)
        }
      }
      catch {
        // Any network / 401 / 400 error means the session is gone
        sessionExpired.value = true
        if (timer) clearInterval(timer)
      }
    }

    onMounted(() => {
      timer = setInterval(checkSession, CHECK_INTERVAL_MS)
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })
  }

  return { sessionExpired }
}
