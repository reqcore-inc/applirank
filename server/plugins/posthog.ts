/**
 * Nitro plugin: initialise PostHog integrations on startup and shut them
 * down cleanly when the server process closes.
 *
 * – PostHog Node client  (event capture, error tracking)
 * – OpenTelemetry logger (PostHog Logs via OTLP)
 */
export default defineNitroPlugin((nitroApp) => {
  // Start the OpenTelemetry LoggerProvider so structured logs
  // are sent to PostHog's /i/v1/logs endpoint throughout the lifetime
  // of the server process.
  initLoggerProvider()

  nitroApp.hooks.hookOnce('close', async () => {
    await Promise.all([
      shutdownServerPostHog(),
      shutdownLoggerProvider(),
    ])
  })
})
