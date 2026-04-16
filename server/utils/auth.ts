import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, genericOAuth } from "better-auth/plugins";
import { sso } from "@better-auth/sso";
import { eq } from "drizzle-orm";
import { ac, owner, admin, member } from "~~/shared/permissions";
import { sendOrgInvitationEmail, sendPasswordResetEmail } from "./email";
import * as schema from "../database/schema";

type Auth = ReturnType<typeof betterAuth>;
let _auth: Auth | undefined;

// ── SSRF blocklist ────────────────────────────────────────────────────────────
// Prevent org admins from using SSO provider registration to probe the
// internal network or cloud metadata services (OWASP A10 - SSRF).
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "169.254.169.254",          // AWS / Azure / DigitalOcean IMDS
  "metadata.google.internal", // GCP IMDS
  "metadata.internal",
  "instance-data",            // older cloud-init
])

/**
 * Returns true if the hostname resolves to a private, loopback, link-local,
 * or well-known cloud metadata address that must not be contacted server-side.
 */
function isBlockedHost(urlString: string): boolean {
  let hostname: string
  try {
    hostname = new URL(urlString).hostname.toLowerCase()
  } catch {
    return true // malformed URL → block
  }
  if (BLOCKED_HOSTNAMES.has(hostname)) return true

  // IPv4 private / loopback ranges
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 127) return true                          // 127.0.0.0/8  loopback
    if (a === 0) return true                            // 0.0.0.0/8
    if (a === 10) return true                           // 10.0.0.0/8   RFC 1918
    if (a === 172 && b >= 16 && b <= 31) return true   // 172.16.0.0/12 RFC 1918
    if (a === 192 && b === 168) return true             // 192.168.0.0/16 RFC 1918
    if (a === 100 && b >= 64 && b <= 127) return true  // 100.64.0.0/10 CGNAT
    if (a === 169 && b === 254) return true             // 169.254.0.0/16 link-local
  }

  // IPv6 loopback and link-local
  if (hostname === "::1") return true
  if (hostname.startsWith("fe80:") || hostname.startsWith("[fe80:")) return true

  return false
}

/**
 * Fetch an OIDC discovery document and inject every endpoint origin into
 * better-auth's live trusted-origins list so the SSO plugin trusts them
 * during provider registration.
 *
 * Why: better-auth resolves `trustedOrigins` once at init and caches the
 * result as a plain array. The SSO plugin then validates every URL in the
 * discovery document (discovery endpoint, token_endpoint, jwks_uri, etc.)
 * against that cached array. IdPs like Google use multiple domains
 * (accounts.google.com vs oauth2.googleapis.com), so we must discover
 * those origins and inject them into the live array before registration.
 *
 * Must be called **before** `auth.api.registerSSOProvider()`.
 */
export async function prefetchOidcEndpointOrigins(issuerUrl: string): Promise<void> {
  // SSRF guard — reject internal/private addresses before any network call
  if (isBlockedHost(issuerUrl)) {
    throw createError({
      statusCode: 422,
      statusMessage: "Issuer URL must not target internal or private network addresses.",
    })
  }

  const discoveryUrl = issuerUrl.replace(/\/+$/, "") + "/.well-known/openid-configuration";
  const res = await $fetch<Record<string, unknown>>(discoveryUrl, {
    timeout: 10_000,
  });

  // Collect origins from all endpoint fields + the issuer itself
  const newOrigins = new Set<string>();
  try { newOrigins.add(new URL(issuerUrl).origin); } catch {}

  const endpointKeys = [
    "authorization_endpoint",
    "token_endpoint",
    "userinfo_endpoint",
    "revocation_endpoint",
    "introspection_endpoint",
    "end_session_endpoint",
    "jwks_uri",
  ];
  for (const key of endpointKeys) {
    const value = res[key];
    if (typeof value === "string") {
      try { newOrigins.add(new URL(value).origin); } catch {}
    }
  }

  // Push directly into better-auth's live trustedOrigins array so
  // isTrustedOrigin() sees them immediately (it reads this.trustedOrigins).
  const ctx = await (auth as any).$context;
  const existing = new Set(ctx.trustedOrigins as string[]);
  for (const origin of newOrigins) {
    if (!existing.has(origin)) {
      (ctx.trustedOrigins as string[]).push(origin);
    }
  }
}

/**
 * Resolve trusted origins for CSRF checks and OIDC discovery.
 *
 * Combines:
 *  1. App origins (base URL, configured origins, dev defaults)
 *  2. Already-registered SSO provider issuers from the database
 *
 * Additional IdP endpoint origins are injected at runtime by
 * `prefetchOidcEndpointOrigins()` directly into the auth context.
 * For edge cases, add origins to the BETTER_AUTH_TRUSTED_ORIGINS env var.
 */
function resolveTrustedOrigins(baseUrl: string): (request?: Request) => Promise<string[]> {
  const configuredOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS;
  const baseOrigin = new URL(baseUrl);
  const isLocalBase =
    baseOrigin.hostname === "localhost" || baseOrigin.hostname === "127.0.0.1";
  const defaultDevOrigins =
    import.meta.dev || isLocalBase
      ? [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002",
          "http://localhost:3333",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:3001",
          "http://127.0.0.1:3002",
          "http://127.0.0.1:3333",
        ]
      : [];

  const staticOrigins = Array.from(
    new Set([baseOrigin.origin, ...configuredOrigins, ...defaultDevOrigins]),
  );

  return async () => {
    const allOrigins = [...staticOrigins];

    // Load already-registered SSO provider issuers from the database
    try {
      const providers = await db
        .select({ issuer: schema.ssoProvider.issuer })
        .from(schema.ssoProvider);

      for (const p of providers) {
        try { allOrigins.push(new URL(p.issuer).origin); } catch {}
      }
    } catch {
      // Table may not exist yet (pre-migration)
    }

    return Array.from(new Set(allOrigins));
  };
}

function resolveBetterAuthUrl(): string {
  const explicitUrl = env.BETTER_AUTH_URL?.trim();
  const railwayDomain = env.RAILWAY_PUBLIC_DOMAIN?.trim();

  // Explicit URL always wins (custom domain, local dev, etc.)
  if (explicitUrl) {
    return explicitUrl;
  }

  // Derive from Railway's auto-injected public domain (works for all environments)
  if (railwayDomain) {
    // Railway sets this as bare domain (e.g. "app.up.railway.app"), never with protocol
    const domain = railwayDomain.replace(/^https?:\/\//, "");
    const url = `https://${domain}`;
    console.info(
      `[Reqcore] Using Railway public-domain BETTER_AUTH_URL: ${url}`,
    );
    return url;
  }

  throw new Error(
    "BETTER_AUTH_URL is required. Either set it explicitly or generate a public domain in Railway.\n" +
      "Railway users: go to Settings → Networking → Generate Domain, then redeploy.",
  );
}

/**
 * Lazily create the Better Auth instance on first access.
 * Prevents build-time prerendering from crashing when auth env vars
 * aren't available (Railway injects env vars only at deploy time).
 */
function getAuth(): Auth {
  if (!_auth) {
    const baseURL = resolveBetterAuthUrl();

    _auth = betterAuth({
      baseURL,
      trustedOrigins: resolveTrustedOrigins(baseURL),
      database: drizzleAdapter(db, {
        provider: "pg",
        schema,
      }),
      secret: env.BETTER_AUTH_SECRET,

      // ── Session Hardening ────────────────────────────────────
      // Explicit session duration for an ATS handling sensitive hiring data.
      // Default Better Auth values (7 days / 1 day) are too permissive.
      session: {
        expiresIn: 60 * 60 * 24, // 24 hours
        updateAge: 60 * 60,      // Refresh session every 1 hour
      },

      emailAndPassword: {
        enabled: true,
        // Server-side password policy — prevents bypass via direct API calls.
        // Client-side validation (sign-up.vue) is UX only; this is the enforcement.
        minPasswordLength: 8,
        maxPasswordLength: 128,
        // Password reset via email.
        async sendResetPassword({ user, url, token }, request) {
          void sendPasswordResetEmail({ user, url, token });
        },
      },

      // ── OAuth Token Encryption at Rest ──────────────────────
      // Better Auth's built-in AES encryption for OAuth tokens (access, refresh, id).
      // Handles both encryption on write and automatic decryption on read,
      // using BETTER_AUTH_SECRET as the encryption key.
      account: {
        encryptOAuthTokens: true,
      },

      // ── Rate Limiting (built-in, database-backed) ──────────
      // Uses DB storage so limits persist across restarts and share
      // state across instances (horizontal scaling).
      // Complements the external IP-based rate limiter in api-rate-limit.ts
      // with account-level throttling for auth-sensitive endpoints.
      // Disabled in CI/test (GITHUB_ACTIONS or NODE_ENV !== 'production')
      // to prevent E2E test flakiness.
      rateLimit: {
        enabled: !process.env.CI && !process.env.GITHUB_ACTIONS,
        window: 60,
        max: 100,        // 100 requests per minute per IP — stops bots, not humans
        storage: "database",
      },

      socialProviders: {
        // ── Social Sign-In (Google, GitHub, Microsoft) ────────────
        // Each provider is enabled only when its client ID + secret are set.
        ...(env.AUTH_GOOGLE_CLIENT_ID && env.AUTH_GOOGLE_CLIENT_SECRET
          ? {
              google: {
                clientId: env.AUTH_GOOGLE_CLIENT_ID,
                clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET,
                prompt: "select_account",
              },
            }
          : {}),
        ...(env.AUTH_GITHUB_CLIENT_ID && env.AUTH_GITHUB_CLIENT_SECRET
          ? {
              github: {
                clientId: env.AUTH_GITHUB_CLIENT_ID,
                clientSecret: env.AUTH_GITHUB_CLIENT_SECRET,
              },
            }
          : {}),
        ...(env.AUTH_MICROSOFT_CLIENT_ID && env.AUTH_MICROSOFT_CLIENT_SECRET
          ? {
              microsoft: {
                clientId: env.AUTH_MICROSOFT_CLIENT_ID,
                clientSecret: env.AUTH_MICROSOFT_CLIENT_SECRET,
                tenantId: env.AUTH_MICROSOFT_TENANT_ID || "common",
                prompt: "select_account",
              },
            }
          : {}),
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
            const inviteLink = `${baseURL}/auth/accept-invitation/${data.id}`;
            await sendOrgInvitationEmail(data, inviteLink);
          },

          // ── Security Hardening ──────────────────────────────────
          // Cancel stale invitations when a new one is sent to the same email.
          cancelPendingInvitationsOnReInvite: true,
          // 48 hours (default) — explicitly stated for auditability.
          invitationExpiresIn: 48 * 60 * 60,
        }),

        // ── OIDC SSO (Keycloak, Authentik, Authelia, Okta, Azure AD, etc.) ──
        // Activated only when all three OIDC env vars are set.
        // Uses better-auth's genericOAuth plugin with OIDC discovery.
        ...(env.OIDC_CLIENT_ID &&
        env.OIDC_CLIENT_SECRET &&
        env.OIDC_DISCOVERY_URL
          ? [
              genericOAuth({
                config: [
                  {
                    providerId: "oidc",
                    clientId: env.OIDC_CLIENT_ID,
                    clientSecret: env.OIDC_CLIENT_SECRET,
                    discoveryUrl: env.OIDC_DISCOVERY_URL,
                    scopes: ["openid", "email", "profile"],
                    pkce: true,
                    requireIssuerValidation: true,
                    async mapProfileToUser(profile) {
                      if (!profile.email) {
                        throw new Error(
                          "Email is required but was not provided by the identity provider. Ensure the 'email' scope is granted and the user has a verified email.",
                        );
                      }
                      return {
                        name:
                          profile.name ||
                          [profile.given_name, profile.family_name]
                            .filter(Boolean)
                            .join(" ") ||
                          profile.preferred_username ||
                          profile.email,
                        email: profile.email,
                        image: profile.picture,
                      };
                    },
                  },
                ],
              }),
            ]
          : []),

        // ── Enterprise SSO (per-organization OIDC, cloud-hosted) ─────────
        // Each organization can register their own Identity Provider (Okta,
        // Azure AD, Google Workspace, etc.). Users are auto-provisioned into
        // the linked organization on first SSO login.
        sso({
          // Auto-provision SSO users into the linked organization
          organizationProvisioning: {
            disabled: false,
            defaultRole: "member",
          },
          // Run provisioning on every login to keep profile data in sync
          provisionUserOnEveryLogin: true,
          provisionUser: async ({ user, userInfo }) => {
            // Sync name/image from IdP on each login
            if (userInfo.name || userInfo.image) {
              await db
                .update(schema.user)
                .set({
                  ...(userInfo.name ? { name: userInfo.name } : {}),
                  ...(userInfo.image ? { image: userInfo.image } : {}),
                  updatedAt: new Date(),
                })
                .where(eq(schema.user.id, user.id));
            }
          },
        }),
      ],
    }) as unknown as Auth;
  }
  return _auth!;
}

/**
 * Lazily-initialized Better Auth instance.
 * The auth configuration is created on first property access — not at import time.
 * This prevents build-time prerendering from failing when BETTER_AUTH_SECRET
 * and BETTER_AUTH_URL aren't available.
 */
export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    const instance = getAuth();
    const value = (instance as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as Function).bind(instance)
      : value;
  },
});
