export default defineEventHandler(async (event) => {
  try {
    return await auth.handler(toWebRequest(event))
  } catch (error) {
    const requestUrl = getRequestURL(event)
    logError('auth.handler_error', {
      http_method: event.method,
      http_path: requestUrl.pathname,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    })

    // Detect BETTER_AUTH_URL mismatch — the #1 self-hosting setup issue
    const requestOrigin = requestUrl.origin
    const configuredUrl = env.BETTER_AUTH_URL?.trim() || env.RAILWAY_PUBLIC_DOMAIN?.trim()
    const configuredOrigin = configuredUrl
      ? (() => { try { return new URL(configuredUrl.startsWith('http') ? configuredUrl : `https://${configuredUrl}`).origin } catch { return configuredUrl } })()
      : undefined
    const isUrlMismatch = configuredOrigin && requestOrigin !== configuredOrigin

    if (isUrlMismatch) {
      logError('auth.url_mismatch', {
        configured_origin: configuredOrigin,
        request_origin: requestOrigin,
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Auth configuration error',
        data: {
          code: 'AUTH_URL_MISMATCH',
          message: `BETTER_AUTH_URL is set to "${configuredOrigin}" but this request came from "${requestOrigin}". `
            + 'Update the BETTER_AUTH_URL environment variable to match your deployment domain, then redeploy.',
        },
      })
    }

    const exposeDetails = isRailwayPreviewEnvironment(env.RAILWAY_ENVIRONMENT_NAME) || import.meta.dev
    const details = error instanceof Error ? error.message : 'Unknown error'

    throw createError({
      statusCode: 500,
      statusMessage: 'Server Error',
      data: {
        code: 'AUTH_HANDLER_ERROR',
        message: exposeDetails
          ? details
          : 'Authentication failed. If you are self-hosting, verify that the BETTER_AUTH_URL environment variable matches your deployment domain (e.g. "https://your-app.up.railway.app") and redeploy.',
      },
    })
  }
})
