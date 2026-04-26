/**
 * Composable that syncs the Better Auth session with PostHog identity.
 * Call once in a root-level layout or app.vue to enable automatic
 * user identification and organization group analytics.
 *
 * Must be called in `<script setup>` context (not in a plugin).
 *
 * Identity model
 * --------------
 * Logged-in users are ALWAYS identified by their opaque `user.id` so that
 * funnel + retention analytics work even for visitors who never accept
 * cookies.  Email and name are forwarded ONLY when the user has explicitly
 * consented to analytics — keeping the dashboard PII-free for non-consenters
 * while still letting consented users be looked up by email in PostHog.
 *
 * The watcher depends on `hasConsented`, so when a user clicks "Accept" in
 * the banner the identify() call re-fires immediately and PostHog aliases
 * the anonymous distinct id to the user id (preserving the in-session
 * funnel from anonymous visit → signup → identified user).
 */
export async function usePostHogIdentity() {
  const { $posthogIdentifyUser, $posthogSetOrganization, $posthogReset, $posthogResetGroups, $posthogSetDemoFlag } = useNuxtApp()

  if (!$posthogIdentifyUser) return

  const { data: session } = await authClient.useSession(useFetch)
  const activeOrgState = authClient.useActiveOrganization()

  const { hasConsented } = useAnalyticsConsent()

  const config = useRuntimeConfig()
  const liveDemoEmail = (config.public.liveDemoEmail as string | undefined) || ''
  const demoOrgSlug = (config.public.demoOrgSlug as string | undefined) || ''

  watch(
    [() => session.value, hasConsented] as const,
    ([currentSession, consented], prev) => {
      const user = currentSession?.user
      const previousUser = (prev?.[0] as typeof session.value)?.user

      if (user?.id) {
        // Forward person properties (email, name) ONLY if consent was given.
        // Without consent we still identify with the opaque user.id so
        // returning users are stable in PostHog — but no PII is attached.
        const identify = $posthogIdentifyUser as (
          userId: string,
          properties?: Record<string, string | undefined>,
        ) => void
        if (consented) {
          identify(user.id, {
            email: user.email,
            name: user.name || undefined,
          })
        }
        else {
          identify(user.id)
        }

        // Demo tagging by user email — fires the moment the demo account
        // signs in, even before an organisation context is loaded.
        const setDemoFlag = $posthogSetDemoFlag as ((isDemo: boolean) => void) | undefined
        if (setDemoFlag && liveDemoEmail) {
          setDemoFlag(user.email === liveDemoEmail)
        }
      }
      else if (previousUser?.id && !user?.id) {
        // Always reset on log-out regardless of consent state so that
        // no user identity leaks into the next anonymous session.
        // Reset also clears the registered super properties (incl. is_demo).
        ($posthogReset as () => void)()
      }
    },
    { immediate: true },
  )

  watch(
    [() => activeOrgState.value?.data, hasConsented] as const,
    async ([org, consented]) => {
      if (org?.id) {
        // Forward org name only for consenters; anonymous users get an
        // opaque org-id-only group so per-org metrics still aggregate.
        const setOrg = $posthogSetOrganization as (org: { id: string, name?: string }) => void
        if (consented) {
          setOrg({ id: org.id, name: org.name || undefined })
        }
        else {
          setOrg({ id: org.id })
        }

        // Demo tagging by org slug — covers self-hosted deployments
        // where the demo org may be owned by a non-demo email account.
        // We only set true here; the email-based watcher above handles
        // clearing the flag when the user is not the demo user.
        const setDemoFlag = $posthogSetDemoFlag as ((isDemo: boolean) => void) | undefined
        if (setDemoFlag && demoOrgSlug && org.slug === demoOrgSlug) {
          setDemoFlag(true)
        }
      }
      else {
        ($posthogResetGroups as (() => void) | undefined)?.()
      }
    },
    { immediate: true },
  )
}
