/**
 * GET /api/auth/providers
 *
 * Returns which authentication providers are enabled at runtime.
 * This replaces build-time runtimeConfig flags so that Docker images
 * built without OAuth credentials still show the correct buttons when
 * credentials are injected at runtime (e.g. Railway, self-hosting).
 */
export default defineEventHandler(() => {
  return {
    google: !!(
      process.env.AUTH_GOOGLE_CLIENT_ID &&
      process.env.AUTH_GOOGLE_CLIENT_SECRET
    ),
    github: !!(
      process.env.AUTH_GITHUB_CLIENT_ID &&
      process.env.AUTH_GITHUB_CLIENT_SECRET
    ),
    microsoft: !!(
      process.env.AUTH_MICROSOFT_CLIENT_ID &&
      process.env.AUTH_MICROSOFT_CLIENT_SECRET
    ),
    oidc: !!(
      process.env.OIDC_CLIENT_ID &&
      process.env.OIDC_CLIENT_SECRET &&
      process.env.OIDC_DISCOVERY_URL
    ),
    oidcProviderName: process.env.OIDC_PROVIDER_NAME || "SSO",
  };
});
