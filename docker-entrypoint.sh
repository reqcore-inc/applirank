#!/bin/sh
# ─── Docker entrypoint ──────────────────────────────────────────────────────
# Derives NUXT_PUBLIC_* boolean flags from credential env vars so that
# Nitro's built-in env resolution picks them up BEFORE runtimeConfig is frozen.
# Without this, flags like authGoogleEnabled are always false when the Docker
# image is built without OAuth credentials (Railway injects them at runtime).
# ─────────────────────────────────────────────────────────────────────────────

if [ -n "$AUTH_GOOGLE_CLIENT_ID" ] && [ -n "$AUTH_GOOGLE_CLIENT_SECRET" ]; then
  export NUXT_PUBLIC_AUTH_GOOGLE_ENABLED=true
fi

if [ -n "$AUTH_GITHUB_CLIENT_ID" ] && [ -n "$AUTH_GITHUB_CLIENT_SECRET" ]; then
  export NUXT_PUBLIC_AUTH_GITHUB_ENABLED=true
fi

if [ -n "$AUTH_MICROSOFT_CLIENT_ID" ] && [ -n "$AUTH_MICROSOFT_CLIENT_SECRET" ]; then
  export NUXT_PUBLIC_AUTH_MICROSOFT_ENABLED=true
fi

if [ -n "$OIDC_CLIENT_ID" ] && [ -n "$OIDC_CLIENT_SECRET" ] && [ -n "$OIDC_DISCOVERY_URL" ]; then
  export NUXT_PUBLIC_OIDC_ENABLED=true
fi

if [ -n "$GITHUB_FEEDBACK_TOKEN" ] && [ -n "$GITHUB_FEEDBACK_REPO" ]; then
  export NUXT_PUBLIC_FEEDBACK_ENABLED=true
fi

exec node .output/server/index.mjs
