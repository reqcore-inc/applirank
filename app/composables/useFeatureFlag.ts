import type { PostHog } from 'posthog-js'
import {
  FEATURE_FLAGS,
  parseFlagOverride,
  type FeatureFlagKey,
  type FeatureFlagValue,
} from '~~/shared/feature-flags'

/**
 * Reactive feature flag composable.
 *
 * Resolution order (highest → lowest priority):
 *   1. URL query string  e.g.  ?ff_chatbot-experience=true
 *   2. Env var override  exposed via runtimeConfig.public.featureFlagOverrides
 *      (self-hosters set FEATURE_FLAG_<KEY> to force a value)
 *   3. PostHog rollout   (only when PostHog is configured)
 *   4. Registry default  from `shared/feature-flags.ts`
 *
 * The returned ref is **always** populated with a usable value (never
 * `undefined`), starting at the registry default and upgrading reactively
 * once PostHog flags load. Templates stay simple:
 *
 * @example
 *   const showChatbot = useFeatureFlag('chatbot-experience')
 *   // template:  <Chatbot v-if="showChatbot" />
 */
export function useFeatureFlag<K extends FeatureFlagKey>(
  flagKey: K,
): Ref<FeatureFlagValue<K>> {
  const def = FEATURE_FLAGS[flagKey]
  const flag = ref(def.defaultValue) as Ref<FeatureFlagValue<K>>

  // 1. URL query (?ff_<key>=...) — works on client only.
  if (import.meta.client) {
    const urlValue = new URLSearchParams(window.location.search).get(`ff_${flagKey}`)
    const parsed = parseFlagOverride(flagKey, urlValue)
    if (parsed !== undefined) {
      flag.value = parsed as FeatureFlagValue<K>
      return flag // URL override wins — short-circuit.
    }
  }

  // 2. Env-var override (forwarded from server via runtimeConfig).
  const overrides = (useRuntimeConfig().public.featureFlagOverrides ?? {}) as
    Partial<Record<FeatureFlagKey, boolean | string>>
  if (overrides[flagKey] !== undefined) {
    flag.value = overrides[flagKey] as FeatureFlagValue<K>
    return flag // Env override wins over PostHog — admin intent is explicit.
  }

  // 3. PostHog (client only — SDK is not available during SSR).
  if (!import.meta.client) return flag

  const $ph = (useNuxtApp() as Record<string, unknown>).$posthog as
    | (() => PostHog)
    | undefined
  const posthog = $ph?.()
  if (!posthog) return flag

  const apply = () => {
    const value = posthog.getFeatureFlag(flagKey)
    if (value !== undefined) flag.value = value as FeatureFlagValue<K>
  }

  apply() // immediate read in case flags are already cached
  posthog.onFeatureFlags(apply) // re-evaluates after fetch / identify / reload

  return flag
}

/**
 * Convenience wrapper: returns `Ref<boolean>` for the common case of a
 * boolean flag. Truthy strings (e.g. variant keys) coerce to `true`.
 *
 * @example
 *   const isEnabled = useFeatureFlagEnabled('chatbot-experience')
 *   // template:  <button v-if="isEnabled">Open chat</button>
 */
export function useFeatureFlagEnabled(flagKey: FeatureFlagKey): Ref<boolean> {
  const value = useFeatureFlag(flagKey)
  return computed(() => {
    const v: unknown = value.value
    return v === true || (typeof v === 'string' && v.length > 0)
  })
}
