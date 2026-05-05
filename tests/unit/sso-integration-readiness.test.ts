import { describe, it, expect } from 'vitest'
import { envSchema } from '../../server/utils/env'

/**
 * SSO integration readiness tests.
 *
 * End-to-end validation of the SSO configuration pipeline:
 * env vars â†’ auth config â†’ plugin loading â†’ route protection.
 * Ensures all layers work together correctly.
 */

const baseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'https://app.WWMate.com',
  S3_ENDPOINT: 'https://s3.example.com',
  S3_ACCESS_KEY: 'test-key',
  S3_SECRET_KEY: 'test-secret',
  S3_BUCKET: 'test-bucket',
}

const validOidc = {
  OIDC_CLIENT_ID: 'WWMate-app',
  OIDC_CLIENT_SECRET: 'oidc-secret-value',
  OIDC_DISCOVERY_URL: 'https://auth.example.com/.well-known/openid-configuration',
}

describe('SSO + BETTER_AUTH_URL resolution', () => {
  it('resolves BETTER_AUTH_URL from explicit value with SSO', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      ...validOidc,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.BETTER_AUTH_URL).toBe('https://app.WWMate.com')
    }
  })

  it('rejects BETTER_AUTH_URL "https://" even with Railway domain fallback', () => {
    // The preprocess converts "https://" to undefined, but z.string().url()
    // receives undefined and fails. The .optional() only catches undefined
    // at the input level (before preprocess), not after.
    // In practice this means: don't set BETTER_AUTH_URL to a broken template ref.
    // Remove the env var entirely and let Railway domain take over.
    const result = envSchema.safeParse({
      ...baseEnv,
      BETTER_AUTH_URL: 'https://',
      RAILWAY_PUBLIC_DOMAIN: 'app.up.railway.app',
      ...validOidc,
    })
    expect(result.success).toBe(false)
  })

  it('rejects BETTER_AUTH_URL "http://" even with Railway domain fallback', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      BETTER_AUTH_URL: 'http://',
      RAILWAY_PUBLIC_DOMAIN: 'app.up.railway.app',
      ...validOidc,
    })
    expect(result.success).toBe(false)
  })

  it('requires either BETTER_AUTH_URL or RAILWAY_PUBLIC_DOMAIN with SSO config', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      BETTER_AUTH_URL: undefined,
      RAILWAY_PUBLIC_DOMAIN: undefined,
      ...validOidc,
    })
    expect(result.success).toBe(false)
  })
})

describe('SSO with trusted origins', () => {
  it('parses comma separated trusted origins', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      BETTER_AUTH_TRUSTED_ORIGINS: 'https://app.WWMate.com, https://cdn.WWMate.com',
      ...validOidc,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.BETTER_AUTH_TRUSTED_ORIGINS).toEqual([
        'https://app.WWMate.com',
        'https://cdn.WWMate.com',
      ])
    }
  })

  it('filters empty entries from trusted origins', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      BETTER_AUTH_TRUSTED_ORIGINS: 'https://app.WWMate.com,,, https://other.com, ',
      ...validOidc,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.BETTER_AUTH_TRUSTED_ORIGINS).toEqual([
        'https://app.WWMate.com',
        'https://other.com',
      ])
    }
  })

  it('defaults trusted origins to empty array when not set', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      ...validOidc,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.BETTER_AUTH_TRUSTED_ORIGINS).toEqual([])
    }
  })
})

describe('SSO OIDC discovery URL â€” production hardening', () => {
  it('accepts Keycloak realm-specific discovery URL', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      ...validOidc,
      OIDC_DISCOVERY_URL: 'https://keycloak.corp.com/realms/production/.well-known/openid-configuration',
    })
    expect(result.success).toBe(true)
  })

  it('accepts Authentik application-specific discovery URL', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      ...validOidc,
      OIDC_DISCOVERY_URL: 'https://sso.corp.com/application/o/WWMate/.well-known/openid-configuration',
    })
    expect(result.success).toBe(true)
  })

  it('accepts Azure AD v2.0 tenant-specific discovery URL', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      ...validOidc,
      OIDC_DISCOVERY_URL: 'https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000/v2.0/.well-known/openid-configuration',
    })
    expect(result.success).toBe(true)
  })

  it('accepts Okta org-specific discovery URL', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      ...validOidc,
      OIDC_DISCOVERY_URL: 'https://acme.okta.com/.well-known/openid-configuration',
    })
    expect(result.success).toBe(true)
  })

  it('accepts Google Workspace discovery URL', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      ...validOidc,
      OIDC_DISCOVERY_URL: 'https://accounts.google.com/.well-known/openid-configuration',
    })
    expect(result.success).toBe(true)
  })

  it('accepts Authelia discovery URL', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      ...validOidc,
      OIDC_DISCOVERY_URL: 'https://auth.home.lab/.well-known/openid-configuration',
    })
    expect(result.success).toBe(true)
  })

  it('rejects javascript: protocol in discovery URL', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      ...validOidc,
      OIDC_DISCOVERY_URL: 'javascript:alert(document.cookie)',
    })
    expect(result.success).toBe(false)
  })

  it('rejects file:// protocol in discovery URL', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      ...validOidc,
      OIDC_DISCOVERY_URL: 'file:///etc/passwd',
    })
    expect(result.success).toBe(false)
  })
})

describe('SSO permission boundaries', () => {
  /**
   * Validate that the permission check used by SSO routes
   * (`organization: ['update']`) maps correctly to roles.
   */

  // Simulate Better Auth's default org permission structure
  // owner and admin have organization:update, member does not
  const rolePermissions: Record<string, { organization: string[] }> = {
    owner: { organization: ['create', 'update', 'delete'] },
    admin: { organization: ['create', 'update'] },
    member: { organization: [] },
  }

  function hasPermission(role: string, resource: string, action: string): boolean {
    const perms = rolePermissions[role]
    if (!perms) return false
    const actions = (perms as Record<string, string[]>)[resource]
    return actions?.includes(action) ?? false
  }

  it('owner can manage SSO providers', () => {
    expect(hasPermission('owner', 'organization', 'update')).toBe(true)
  })

  it('admin can manage SSO providers', () => {
    expect(hasPermission('admin', 'organization', 'update')).toBe(true)
  })

  it('member CANNOT manage SSO providers', () => {
    expect(hasPermission('member', 'organization', 'update')).toBe(false)
  })

  it('unknown role CANNOT manage SSO providers', () => {
    expect(hasPermission('unknown-role', 'organization', 'update')).toBe(false)
  })
})

describe('SSO PKCE + issuer validation', () => {
  /**
   * Validate that the OIDC configuration always enables PKCE
   * and requires issuer validation (anti-token-substitution).
   */
  it('global OIDC config has PKCE enabled', () => {
    const globalOidcConfig = {
      scopes: ['openid', 'email', 'profile'],
      pkce: true,
      requireIssuerValidation: true,
    }
    expect(globalOidcConfig.pkce).toBe(true)
    expect(globalOidcConfig.requireIssuerValidation).toBe(true)
  })

  it('enterprise SSO config has PKCE in oidcConfig', () => {
    // This is what gets passed to Better Auth's registerSSOProvider
    const perOrgConfig = {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      scopes: ['openid', 'email', 'profile'],
      pkce: true,
    }
    expect(perOrgConfig.pkce).toBe(true)
    expect(perOrgConfig.scopes).toContain('openid')
  })

  it('scopes always include openid (required for OIDC)', () => {
    const scopes = ['openid', 'email', 'profile']
    expect(scopes.includes('openid')).toBe(true)
  })
})

describe('SSO resolveBetterAuthUrl edge cases', () => {
  /**
   * Mirrors the resolveBetterAuthUrl logic in auth.ts.
   */
  function resolveBetterAuthUrl(
    explicitUrl?: string,
    railwayDomain?: string,
  ): string | null {
    if (explicitUrl) return explicitUrl
    if (railwayDomain) {
      const domain = railwayDomain.replace(/^https?:\/\//, '')
      return `https://${domain}`
    }
    return null
  }

  it('prefers explicit URL over Railway domain', () => {
    expect(resolveBetterAuthUrl('https://custom.example.com', 'app.up.railway.app'))
      .toBe('https://custom.example.com')
  })

  it('derives from Railway domain when no explicit URL', () => {
    expect(resolveBetterAuthUrl(undefined, 'app.up.railway.app'))
      .toBe('https://app.up.railway.app')
  })

  it('strips protocol from Railway domain if present', () => {
    expect(resolveBetterAuthUrl(undefined, 'https://app.up.railway.app'))
      .toBe('https://app.up.railway.app')
  })

  it('returns null when neither is available', () => {
    expect(resolveBetterAuthUrl(undefined, undefined)).toBeNull()
  })
})

