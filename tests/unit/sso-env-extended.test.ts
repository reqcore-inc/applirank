import { describe, it, expect } from 'vitest'
import { envSchema } from '../../server/utils/env'

/**
 * Extended OIDC SSO environment configuration tests.
 *
 * Focused on edge cases, security hardening, and production readiness
 * beyond what the baseline oidc-sso.test.ts covers.
 */

const baseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'https://app.example.com',
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

describe('OIDC SSO â€” extended edge cases', () => {
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Railway domain fallback (no explicit BETTER_AUTH_URL)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('Railway environment compatibility', () => {
    it('accepts OIDC config when BETTER_AUTH_URL is derived from RAILWAY_PUBLIC_DOMAIN', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        BETTER_AUTH_URL: undefined, // not explicitly set
        RAILWAY_PUBLIC_DOMAIN: 'app.up.railway.app',
        ...validOidc,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.OIDC_CLIENT_ID).toBe('WWMate-app')
      }
    })

    it('rejects when neither BETTER_AUTH_URL nor RAILWAY_PUBLIC_DOMAIN is set', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        BETTER_AUTH_URL: undefined,
        RAILWAY_PUBLIC_DOMAIN: undefined,
        ...validOidc,
      })
      expect(result.success).toBe(false)
    })
  })

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Empty string normalization (Railway quirk)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('empty string normalization', () => {
    it('treats whitespace-only OIDC_CLIENT_ID as unset (no partial config error when all are whitespace)', () => {
      // Railway sometimes sets env vars to "" â€” emptyToUndefined normalizes them
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_CLIENT_ID: '  ',
        OIDC_CLIENT_SECRET: '  ',
        OIDC_DISCOVERY_URL: '  ',
      })
      // All go through emptyToUndefined â†’ undefined â†’ fails inner z.string() validation
      // This means they become undefined-like, but the inner pipe rejects them
      expect(result.success).toBe(false)
    })

    it('treats tab-only OIDC_CLIENT_ID as empty', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_CLIENT_ID: '\t',
        OIDC_CLIENT_SECRET: 'secret',
        OIDC_DISCOVERY_URL: 'https://auth.example.com/.well-known/openid-configuration',
      })
      expect(result.success).toBe(false)
    })
  })

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // OIDC_DISCOVERY_URL edge cases
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('OIDC discovery URL edge cases', () => {
    it('accepts HTTP URL for local dev environments', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        ...validOidc,
        OIDC_DISCOVERY_URL: 'http://localhost:8080/realms/master/.well-known/openid-configuration',
      })
      expect(result.success).toBe(true)
    })

    it('accepts HTTPS URL with IP address', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        ...validOidc,
        OIDC_DISCOVERY_URL: 'https://192.168.1.100:8443/.well-known/openid-configuration',
      })
      expect(result.success).toBe(true)
    })

    it('rejects FTP protocol in discovery URL', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        ...validOidc,
        OIDC_DISCOVERY_URL: 'ftp://auth.example.com/.well-known/openid-configuration',
      })
      expect(result.success).toBe(false)
    })

    it('rejects data: URI as discovery URL', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        ...validOidc,
        OIDC_DISCOVERY_URL: 'data:text/html,<script>alert(1)</script>',
      })
      expect(result.success).toBe(false)
    })
  })

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // OIDC_PROVIDER_NAME edge cases
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('OIDC provider name edge cases', () => {
    it('accepts provider name with special characters (Umlauts, etc.)', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        ...validOidc,
        OIDC_PROVIDER_NAME: 'Unternehmen SSO (Entra)',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.OIDC_PROVIDER_NAME).toBe('Unternehmen SSO (Entra)')
      }
    })

    it('defaults OIDC_PROVIDER_NAME to "SSO" when not supplied with valid OIDC config', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        ...validOidc,
        // OIDC_PROVIDER_NAME deliberately omitted
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.OIDC_PROVIDER_NAME).toBe('SSO')
      }
    })
  })

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // BETTER_AUTH_SECRET enforcement
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('auth secret strength with SSO', () => {
    it('rejects short BETTER_AUTH_SECRET even with valid OIDC config', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        BETTER_AUTH_SECRET: 'short',
        ...validOidc,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message)
        expect(messages.some(m => m.includes('at least 32 characters'))).toBe(true)
      }
    })
  })

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // BETTER_AUTH_TRUSTED_ORIGINS + OIDC
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  describe('trusted origins with OIDC', () => {
    it('parses BETTER_AUTH_TRUSTED_ORIGINS alongside OIDC config', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        BETTER_AUTH_TRUSTED_ORIGINS: 'https://app.example.com,https://cdn.example.com',
        ...validOidc,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.BETTER_AUTH_TRUSTED_ORIGINS).toEqual([
          'https://app.example.com',
          'https://cdn.example.com',
        ])
      }
    })
  })
})

