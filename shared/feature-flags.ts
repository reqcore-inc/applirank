/**
 * Feature flag registry — single source of truth for all flags in Reqcore.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Why a registry?
 * ────────────────────────────────────────────────────────────────────────────
 * Reqcore is open source and many users self-host. They typically do NOT run
 * PostHog. We still want feature flags to "just work" for them (using the
 * registered default value) without any external dependency.
 *
 * Resolution order (highest → lowest priority):
 *   1. URL query string  e.g.  ?ff_chatbot-experience=true     (dev / QA)
 *   2. Env var override  e.g.  FEATURE_FLAG_CHATBOT_EXPERIENCE=true
 *      (self-hosters can force a flag on/off without PostHog)
 *   3. PostHog rollout   (only when POSTHOG_PUBLIC_KEY is configured —
 *      used on cloud for gradual rollouts and per-user targeting)
 *   4. Registry default  (defined here)
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Adding a new flag
 * ────────────────────────────────────────────────────────────────────────────
 *   1. Add an entry below.
 *   2. Pick a `defaultValue` that is safe for self-hosters (usually `false`
 *      for in-development features, `true` for stable features being
 *      gradually retired behind a kill-switch).
 *   3. If the flag should be available on the cloud version with gradual
 *      rollout, create the matching flag in PostHog with the SAME key.
 *   4. Use it via `useFeatureFlag('your-key')` in components or
 *      `resolveServerFeatureFlag(event, 'your-key', ...)` in API handlers.
 */

export interface FeatureFlagDefinition {
  /** Default value when no override and no PostHog rollout applies. */
  readonly defaultValue: boolean | string
  /** Short human-readable description (shown in docs and dev tooling). */
  readonly description: string
  /**
   * Multivariate flags: list of allowed string values. Omit for boolean flags.
   * Used to validate URL / env overrides.
   */
  readonly variants?: readonly string[]
}

export const FEATURE_FLAGS = {
  /**
   * New AI chatbot experience embedded in the dashboard.
   *
   * Off by default everywhere. Enable on the cloud version via PostHog
   * (gradual rollout), or self-hosters can force it on with
   * `FEATURE_FLAG_CHATBOT_EXPERIENCE=true`.
   */
  'chatbot-experience': {
    defaultValue: false,
    description: 'New AI chatbot experience in the dashboard.',
  },
} as const satisfies Record<string, FeatureFlagDefinition>

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS

export type FeatureFlagValue<K extends FeatureFlagKey> =
  (typeof FEATURE_FLAGS)[K]['defaultValue'] extends boolean
    ? boolean
    : boolean | string

/** All flag keys, useful for iterating in dev tooling. */
export const FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]

/**
 * Map a flag key to the env var name that overrides it.
 *   'chatbot-experience' → 'FEATURE_FLAG_CHATBOT_EXPERIENCE'
 */
export function flagEnvVarName(key: string): string {
  return `FEATURE_FLAG_${key.toUpperCase().replace(/-/g, '_')}`
}

/**
 * Parse a raw override string ("true" / "false" / variant key) into a value
 * compatible with the flag's definition. Returns `undefined` if invalid so
 * callers fall through to the next layer in the resolution order.
 */
export function parseFlagOverride(
  key: FeatureFlagKey,
  raw: string | undefined | null,
): boolean | string | undefined {
  if (raw == null) return undefined
  const trimmed = raw.trim()
  if (trimmed === '') return undefined

  const def = FEATURE_FLAGS[key]
  const lower = trimmed.toLowerCase()

  if (lower === 'true' || lower === '1' || lower === 'on') return true
  if (lower === 'false' || lower === '0' || lower === 'off') return false

  // Multivariate flag: only accept declared variants.
  if (def.variants && def.variants.includes(trimmed)) return trimmed

  return undefined
}

/**
 * Read all env-var overrides at once. Used at startup to populate
 * `runtimeConfig.public.featureFlagOverrides` so the client knows which
 * flags the self-hoster has forced.
 */
export function readEnvFlagOverrides(
  env: Record<string, string | undefined> = process.env,
): Partial<Record<FeatureFlagKey, boolean | string>> {
  const overrides: Partial<Record<FeatureFlagKey, boolean | string>> = {}
  for (const key of FEATURE_FLAG_KEYS) {
    const raw = env[flagEnvVarName(key)]
    const parsed = parseFlagOverride(key, raw)
    if (parsed !== undefined) overrides[key] = parsed
  }
  return overrides
}
