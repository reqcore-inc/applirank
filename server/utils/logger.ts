import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { logs, SeverityNumber } from '@opentelemetry/api-logs'
import type { AnyValueMap } from '@opentelemetry/api-logs'
import { resourceFromAttributes } from '@opentelemetry/resources'
import type { H3Event } from 'h3'
import { version as APP_VERSION } from '../../package.json'

let loggerProvider: LoggerProvider | null = null

/**
 * Initialize the OpenTelemetry LoggerProvider that sends structured logs
 * to PostHog via OTLP HTTP.
 *
 * Call once during server startup (Nitro plugin). Subsequent calls are no-ops.
 */
export function initLoggerProvider(): void {
  if (loggerProvider) return

  const token = process.env.POSTHOG_PUBLIC_KEY
  if (!token) return

  const host = process.env.POSTHOG_HOST || 'https://eu.i.posthog.com'

  loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      'service.name': 'reqcore',
      'service.version': APP_VERSION,
      'deployment.environment': process.env.RAILWAY_ENVIRONMENT_NAME || 'development',
    }),
    processors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: `${host}/i/v1/logs`,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ),
    ],
  })

  logs.setGlobalLoggerProvider(loggerProvider)
}

/**
 * Flush pending logs and shut down the provider.
 * Call during server shutdown so buffered logs aren't lost.
 */
export async function shutdownLoggerProvider(): Promise<void> {
  if (!loggerProvider) return
  await loggerProvider.forceFlush()
  await loggerProvider.shutdown()
  loggerProvider = null
}

// ─────────────────────────────────────────────
// Convenience logger — wraps the OTel API
// ─────────────────────────────────────────────

function getLogger() {
  return logs.getLogger('reqcore')
}

interface LogContext {
  posthog_distinct_id?: string
  org_id?: string
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Emit an INFO-level structured log to PostHog.
 */
export function logInfo(body: string, attributes?: LogContext): void {
  try {
    getLogger().emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body,
      attributes: attributes as AnyValueMap,
    })
  }
  catch {
    // Logging must never break the primary operation
  }
}

/**
 * Emit a WARN-level structured log to PostHog.
 */
export function logWarn(body: string, attributes?: LogContext): void {
  try {
    getLogger().emit({
      severityNumber: SeverityNumber.WARN,
      severityText: 'WARN',
      body,
      attributes: attributes as AnyValueMap,
    })
  }
  catch {
    // Logging must never break the primary operation
  }
}

/**
 * Emit an ERROR-level structured log to PostHog.
 */
export function logError(body: string, attributes?: LogContext): void {
  try {
    getLogger().emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body,
      attributes: attributes as AnyValueMap,
    })
  }
  catch {
    // Logging must never break the primary operation
  }
}

/**
 * Emit a DEBUG-level structured log to PostHog.
 * Use for detailed diagnostics during active investigation. Off in production
 * by default — enable selectively for specific services.
 */
export function logDebug(body: string, attributes?: LogContext): void {
  try {
    getLogger().emit({
      severityNumber: SeverityNumber.DEBUG,
      severityText: 'DEBUG',
      body,
      attributes: attributes as AnyValueMap,
    })
  }
  catch {
    // Logging must never break the primary operation
  }
}

/**
 * Extract common request attributes from an H3 event for wide-event logging.
 * Includes PostHog session_id for Session Replay linking when available.
 */
export function requestAttributes(event: H3Event): Record<string, string | undefined> {
  const headers = getHeaders(event)
  // Extract PostHog session_id from the cookie for Session Replay linking.
  // The ph_<project>_posthog cookie stores a JSON blob; $sesid contains the
  // active session ID.  We also extract the distinct_id for identity linking.
  let sessionId: string | undefined
  let cookieDistinctId: string | undefined
  try {
    const phCookie = getCookie(event, 'ph_reqcore_posthog')
    if (phCookie) {
      const parsed = JSON.parse(phCookie)
      sessionId = parsed?.$sesid?.[1]
      cookieDistinctId = parsed?.distinct_id
    }
  }
  catch {
    // Cookie may be missing or malformed — non-critical
  }
  return {
    http_method: getMethod(event),
    http_path: getRequestURL(event).pathname,
    user_agent: headers['user-agent'],
    ...(sessionId ? { '$session_id': sessionId } : {}),
    ...(cookieDistinctId ? { posthog_distinct_id: cookieDistinctId } : {}),
  }
}

interface SessionInfo {
  user: { id: string }
  session: { activeOrganizationId: string }
}

/**
 * Build a wide-event log for a completed API request.
 * Follows PostHog best practices: one structured log per request with full context.
 */
export function logApiRequest(
  event: H3Event,
  session: SessionInfo | null,
  body: string,
  extra?: Record<string, unknown>,
): void {
  logInfo(body, {
    ...requestAttributes(event),
    posthog_distinct_id: session?.user?.id,
    org_id: session?.session?.activeOrganizationId,
    ...extra,
  })
}

/**
 * Log an API error as a wide event with full request context.
 */
export function logApiError(
  event: H3Event,
  session: SessionInfo | null,
  body: string,
  extra?: Record<string, unknown>,
): void {
  logError(body, {
    ...requestAttributes(event),
    posthog_distinct_id: session?.user?.id,
    org_id: session?.session?.activeOrganizationId,
    ...extra,
  })
}
