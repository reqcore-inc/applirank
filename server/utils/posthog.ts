import { PostHog } from 'posthog-node'
import { version as APP_VERSION } from '../../package.json'

let client: PostHog | null = null

/**
 * Lazily-initialized server-side PostHog client for backend event capture.
 * Uses the same public key and host configured for the Nuxt module.
 *
 * Returns `null` when POSTHOG_PUBLIC_KEY is not set (e.g. local dev),
 * so callers should null-check before calling methods.
 */
export function useServerPostHog(): PostHog | null {
  if (client) return client

  const publicKey = process.env.POSTHOG_PUBLIC_KEY
  const host = process.env.POSTHOG_HOST

  if (!publicKey) {
    return null
  }

  // POSTHOG_FEATURE_FLAGS_KEY is the "Feature Flags Secure API Key" from
  // PostHog → Project Settings → Feature Flags.  When set, the server SDK
  // fetches flag definitions on startup and evaluates them locally — no
  // per-request network round trip, and much faster flag checks.
  const featureFlagsKey = process.env.POSTHOG_FEATURE_FLAGS_KEY

  client = new PostHog(publicKey, {
    host: host || 'https://eu.i.posthog.com',
    // Flush events every 10 seconds or 20 events, whichever comes first
    flushAt: 20,
    flushInterval: 10_000,
    // Enable automatic capture of uncaught exceptions and unhandled rejections
    enableExceptionAutocapture: true,
    // Local evaluation: periodically fetches flag definitions so checks are
    // fast and free of per-request API calls.  Only active when the secure
    // API key is configured.
    ...(featureFlagsKey ? { personalApiKey: featureFlagsKey } : {}),
  })

  // Register super properties included with every server-side event
  client.register({
    $app_name: 'reqcore',
    $app_version: APP_VERSION,
    $environment: process.env.RAILWAY_ENVIRONMENT_NAME || 'development',
    $source: 'server',
  })

  return client
}

/**
 * Flush pending events and shut down the PostHog Node client.
 * Call this during server shutdown (Nitro close hook) so that buffered events
 * are not lost and the flush-interval timer does not prevent clean exit.
 */
export async function shutdownServerPostHog(): Promise<void> {
  if (!client) return
  await client.shutdown()
  client = null
}
