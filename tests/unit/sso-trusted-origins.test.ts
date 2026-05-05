import { describe, it, expect } from 'vitest'

/**
 * Tests for the SSO trusted origins resolver logic.
 *
 * The resolveTrustedOrigins function in auth.ts dynamically adds IdP origins
 * for SSO callback flows. These tests verify the URL parsing and filtering
 * logic that would be applied to registered SSO provider issuers and
 * OIDC discovery documents.
 */

describe('SSO trusted origins â€” OIDC discovery endpoint extraction', () => {
  /**
   * Simulates the endpoint origin extraction from prefetchOidcEndpointOrigins.
   * This mirrors the logic in server/utils/auth.ts without network calls.
   */
  function extractEndpointOrigins(discoveryDoc: Record<string, unknown>): string[] {
    const endpointKeys = [
      'authorization_endpoint',
      'token_endpoint',
      'userinfo_endpoint',
      'revocation_endpoint',
      'introspection_endpoint',
      'end_session_endpoint',
      'jwks_uri',
    ]
    const origins = new Set<string>()
    for (const key of endpointKeys) {
      const value = discoveryDoc[key]
      if (typeof value === 'string') {
        try { origins.add(new URL(value).origin) } catch {}
      }
    }
    return [...origins]
  }

  it('extracts origins from Google discovery doc (multi-domain)', () => {
    // Google uses different domains for issuer vs endpoints
    const googleDiscovery = {
      issuer: 'https://accounts.google.com',
      authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_endpoint: 'https://oauth2.googleapis.com/token',
      userinfo_endpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
      jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
      revocation_endpoint: 'https://oauth2.googleapis.com/revoke',
    }
    const origins = extractEndpointOrigins(googleDiscovery)
    expect(origins).toContain('https://accounts.google.com')
    expect(origins).toContain('https://oauth2.googleapis.com')
    expect(origins).toContain('https://openidconnect.googleapis.com')
    expect(origins).toContain('https://www.googleapis.com')
  })

  it('extracts origins from Azure AD discovery doc', () => {
    const azureDiscovery = {
      authorization_endpoint: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize',
      token_endpoint: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
      userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
      jwks_uri: 'https://login.microsoftonline.com/tenant/discovery/v2.0/keys',
      end_session_endpoint: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/logout',
    }
    const origins = extractEndpointOrigins(azureDiscovery)
    expect(origins).toContain('https://login.microsoftonline.com')
    expect(origins).toContain('https://graph.microsoft.com')
  })

  it('deduplicates origins from same-domain endpoints', () => {
    const keycloakDiscovery = {
      authorization_endpoint: 'https://kc.corp.com/realms/prod/protocol/openid-connect/auth',
      token_endpoint: 'https://kc.corp.com/realms/prod/protocol/openid-connect/token',
      userinfo_endpoint: 'https://kc.corp.com/realms/prod/protocol/openid-connect/userinfo',
      jwks_uri: 'https://kc.corp.com/realms/prod/protocol/openid-connect/certs',
    }
    const origins = extractEndpointOrigins(keycloakDiscovery)
    expect(origins).toEqual(['https://kc.corp.com'])
  })

  it('skips non-string and missing endpoint values', () => {
    const partialDoc = {
      authorization_endpoint: 'https://auth.example.com/authorize',
      token_endpoint: null,
      userinfo_endpoint: 12345,
      jwks_uri: undefined,
    }
    const origins = extractEndpointOrigins(partialDoc)
    expect(origins).toEqual(['https://auth.example.com'])
  })

  it('skips malformed URLs gracefully', () => {
    const badDoc = {
      authorization_endpoint: 'not-a-url',
      token_endpoint: 'https://valid.example.com/token',
    }
    const origins = extractEndpointOrigins(badDoc)
    expect(origins).toEqual(['https://valid.example.com'])
  })
})

describe('SSO trusted origins â€” issuer URL parsing', () => {
  /**
   * Simulates the issuer â†’ origin extraction from resolveTrustedOrigins.
   * This mirrors the logic in server/utils/auth.ts without requiring
   * a database or running Better Auth instance.
   */
  function extractOriginFromIssuer(issuer: string): string | null {
    try {
      return new URL(issuer).origin
    } catch {
      return null
    }
  }

  it('extracts origin from a standard issuer URL', () => {
    expect(extractOriginFromIssuer('https://login.company.com/realms/prod'))
      .toBe('https://login.company.com')
  })

  it('extracts origin from Okta issuer', () => {
    expect(extractOriginFromIssuer('https://acme.okta.com'))
      .toBe('https://acme.okta.com')
  })

  it('extracts origin from Azure AD issuer with path', () => {
    expect(extractOriginFromIssuer('https://login.microsoftonline.com/tenant-id/v2.0'))
      .toBe('https://login.microsoftonline.com')
  })

  it('extracts origin from Google issuer', () => {
    expect(extractOriginFromIssuer('https://accounts.google.com'))
      .toBe('https://accounts.google.com')
  })

  it('extracts origin from issuer with non-standard port', () => {
    expect(extractOriginFromIssuer('https://keycloak.internal.corp:8443/realms/prod'))
      .toBe('https://keycloak.internal.corp:8443')
  })

  it('returns null for invalid issuer URLs', () => {
    expect(extractOriginFromIssuer('not-a-url')).toBeNull()
    expect(extractOriginFromIssuer('')).toBeNull()
  })

  it('strips path from issuer to only return origin', () => {
    const origin = extractOriginFromIssuer('https://auth.company.com/deep/nested/path?query=1')
    expect(origin).toBe('https://auth.company.com')
    // Must not include path, query, or fragment
    expect(origin).not.toContain('/deep')
    expect(origin).not.toContain('?')
  })

  it('deduplicates origins from multiple providers with same host', () => {
    const issuers = [
      'https://auth.company.com/realms/staging',
      'https://auth.company.com/realms/production',
      'https://other.idp.com',
    ]
    const origins = [...new Set(
      issuers.map(extractOriginFromIssuer).filter((o): o is string => o !== null),
    )]
    expect(origins).toEqual([
      'https://auth.company.com',
      'https://other.idp.com',
    ])
  })
})

describe('SSO flow URL detection', () => {
  /**
   * Mirrors the isSsoFlow check from resolveTrustedOrigins.
   */
  function isSsoFlow(url: string): boolean {
    return url.includes('/sso/') || url.includes('/sign-in/sso')
  }

  it('detects SSO callback URLs', () => {
    expect(isSsoFlow('https://app.WWMate.com/api/auth/sso/callback/acme-sso')).toBe(true)
  })

  it('detects SSO sign-in URLs', () => {
    expect(isSsoFlow('https://app.WWMate.com/api/auth/sign-in/sso')).toBe(true)
  })

  it('does not flag regular auth routes', () => {
    expect(isSsoFlow('https://app.WWMate.com/api/auth/sign-in/email')).toBe(false)
    expect(isSsoFlow('https://app.WWMate.com/api/auth/session')).toBe(false)
    expect(isSsoFlow('https://app.WWMate.com/dashboard')).toBe(false)
  })

  it('does not flag routes with "sso" in other contexts', () => {
    // "sso" appears but not in a path segment matching the check
    expect(isSsoFlow('https://app.WWMate.com/api/auth/sso-settings')).toBe(false)
  })
})

