import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization, genericOAuth } from 'better-auth/plugins'
import { ac, owner, admin, member } from '~~/shared/permissions'
import { sendOrgInvitationEmail } from './email'
import * as schema from '../database/schema'

type Auth = ReturnType<typeof betterAuth>
let _auth: Auth | undefined

function resolveTrustedOrigins(baseUrl: string): string[] {
  const configuredOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS
  const baseOrigin = new URL(baseUrl)
  const isLocalBase = baseOrigin.hostname === 'localhost' || baseOrigin.hostname === '127.0.0.1'
  const defaultDevOrigins = (import.meta.dev || isLocalBase)
    ? [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3333',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
        'http://127.0.0.1:3333',
      ]
    : []

  return Array.from(new Set([baseOrigin.origin, ...configuredOrigins, ...defaultDevOrigins]))
}

function resolveBetterAuthUrl(): string {
  const explicitUrl = env.BETTER_AUTH_URL?.trim()
  const railwayDomain = env.RAILWAY_PUBLIC_DOMAIN?.trim()

  // Explicit URL always wins (custom domain, local dev, etc.)
  if (explicitUrl) {
    return explicitUrl
  }

  // Derive from Railway's auto-injected public domain (works for all environments)
  if (railwayDomain) {
    // Railway sets this as bare domain (e.g. "app.up.railway.app"), never with protocol
    const domain = railwayDomain.replace(/^https?:\/\//, '')
    const url = `https://${domain}`
    console.info(`[Reqcore] Using Railway public-domain BETTER_AUTH_URL: ${url}`)
    return url
  }

  throw new Error(
    'BETTER_AUTH_URL is required. Either set it explicitly or generate a public domain in Railway.\n' +
    'Railway users: go to Settings → Networking → Generate Domain, then redeploy.',
  )
}

/**
 * Lazily create the Better Auth instance on first access.
 * Prevents build-time prerendering from crashing when auth env vars
 * aren't available (Railway injects env vars only at deploy time).
 */
function getAuth(): Auth {
  if (!_auth) {
    const baseURL = resolveBetterAuthUrl()

    _auth = betterAuth({
      baseURL,
      trustedOrigins: resolveTrustedOrigins(baseURL),
      database: drizzleAdapter(db, {
        provider: 'pg',
        schema,
      }),
      secret: env.BETTER_AUTH_SECRET,
      emailAndPassword: {
        enabled: true,
      },
      plugins: [
        organization({
          // ── Access Control ──────────────────────────────────────
          // Declarative RBAC — permissions defined once in shared/permissions.ts,
          // enforced on every API route via requirePermission().
          ac,
          roles: {
            owner,
            admin,
            member,
          },

          // ── Invitation Email ────────────────────────────────────
          // Required for Better Auth's built-in invitation flow.
          // Constructs a link the invitee clicks to accept.
          // Uses Resend when RESEND_API_KEY is configured, otherwise logs to console.
          async sendInvitationEmail(data) {
            const inviteLink = `${baseURL}/auth/accept-invitation/${data.id}`
            await sendOrgInvitationEmail(data, inviteLink)
          },

          // ── Security Hardening ──────────────────────────────────
          // Cancel stale invitations when a new one is sent to the same email.
          cancelPendingInvitationsOnReInvite: true,
          // 48 hours (default) — explicitly stated for auditability.
          invitationExpiresIn: 48 * 60 * 60,
        }),

        // ── Keycloak SSO ──────────────────────────────────────────
        ...(env.KC_CLIENT_ID && env.KC_CLIENT_SECRET && env.KC_DISCOVERY_URL
          ? [genericOAuth({
              config: [{
                providerId: 'keycloak',
                clientId: env.KC_CLIENT_ID,
                clientSecret: env.KC_CLIENT_SECRET,
                discoveryUrl: env.KC_DISCOVERY_URL,
                scopes: ['openid', 'email', 'profile'],
                pkce: true,
                mapProfileToUser: (profile) => ({
                  name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim(),
                  email: profile.email,
                  image: profile.picture,
                }),
              }],
            })]
          : []),
      ],
    }) as unknown as Auth
  }
  return _auth!
}

/**
 * Lazily-initialized Better Auth instance.
 * The auth configuration is created on first property access — not at import time.
 * This prevents build-time prerendering from failing when BETTER_AUTH_SECRET
 * and BETTER_AUTH_URL aren't available.
 */
export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    const instance = getAuth()
    const value = (instance as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as Function).bind(instance) : value
  },
})
