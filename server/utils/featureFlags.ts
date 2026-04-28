import type { H3Event } from 'h3'
import {
  FEATURE_FLAGS,
  flagEnvVarName,
  parseFlagOverride,
  type FeatureFlagKey,
  type FeatureFlagValue,
} from '../../shared/feature-flags'
import { useServerPostHog } from './posthog'

/**
 * Resolve a feature flag on the server.
 *
 * Resolution order (matches `useFeatureFlag` on the client):
 *   1. Env var override   FEATURE_FLAG_<KEY>           (self-hoster force)
 *   2. PostHog rollout    (only when POSTHOG_PUBLIC_KEY is set)
 *   3. Registry default
 *
 * PostHog evaluation is fast & local when `POSTHOG_FEATURE_FLAGS_KEY` is set
 * (no per-request HTTP round trip). Falls back to a network call otherwise.
 *
 * `distinctId` is required for any per-user/per-org rollout to work.
 * Pass the user id when known, otherwise a stable anonymous id.
 *
 * @example
 *   const enabled = await resolveServerFeatureFlag('chatbot-experience', {
 *     distinctId: session.user.id,
 *     groups: { organization: session.organizationId },
 *   })
 *   if (enabled) { ... }
 */
export async function resolveServerFeatureFlag<K extends FeatureFlagKey>(
  key: K,
  options: {
    distinctId: string
    groups?: Record<string, string>
  },
): Promise<FeatureFlagValue<K>> {
  const def = FEATURE_FLAGS[key]

  // 1. Env var override (self-hoster force)
  const envOverride = parseFlagOverride(key, process.env[flagEnvVarName(key)])
  if (envOverride !== undefined) return envOverride as FeatureFlagValue<K>

  // 2. PostHog (cloud / opt-in self-hosted)
  const posthog = useServerPostHog()
  if (posthog) {
    try {
      const value = await posthog.getFeatureFlag(key, options.distinctId, {
        groups: options.groups,
      })
      if (value !== undefined) return value as FeatureFlagValue<K>
    } catch {
      // Network or definition error — fall through to default. Never block
      // the request because of analytics.
    }
  }

  // 3. Registry default
  return def.defaultValue as FeatureFlagValue<K>
}

/**
 * Convenience: returns `true` iff the flag resolves to a truthy value.
 * Use for boolean flags. For multivariate flags use `resolveServerFeatureFlag`.
 */
export async function isServerFeatureEnabled(
  key: FeatureFlagKey,
  options: { distinctId: string; groups?: Record<string, string> },
): Promise<boolean> {
  const value = await resolveServerFeatureFlag(key, options)
  return value === true || (typeof value === 'string' && value.length > 0)
}

/**
 * Helper that derives `distinctId` and `groups` from an authenticated H3 event
 * and resolves a flag. Returns the registry default when no session is
 * available (e.g. anonymous routes).
 */
export async function resolveFeatureFlagForEvent<K extends FeatureFlagKey>(
  _event: H3Event,
  key: K,
  session: { userId?: string; organizationId?: string } | null,
): Promise<FeatureFlagValue<K>> {
  if (!session?.userId) {
    // Still honour env override even without a user.
    const envOverride = parseFlagOverride(key, process.env[flagEnvVarName(key)])
    if (envOverride !== undefined) return envOverride as FeatureFlagValue<K>
    return FEATURE_FLAGS[key].defaultValue as FeatureFlagValue<K>
  }
  return resolveServerFeatureFlag(key, {
    distinctId: session.userId,
    groups: session.organizationId
      ? { organization: session.organizationId }
      : undefined,
  })
}
