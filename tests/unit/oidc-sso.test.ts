import { describe, it, expect } from 'vitest'
import { envSchema } from '../../server/utils/env'

/**
 * Base env vars required to satisfy the schema (all non-OIDC required fields).
 * Used as a foundation; individual tests override specific fields.
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

describe('OIDC SSO environment configuration', () => {
  describe('all three OIDC vars set', () => {
    it('accepts valid OIDC configuration', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_CLIENT_ID: 'WWMate',
        OIDC_CLIENT_SECRET: 'super-secret',
        OIDC_DISCOVERY_URL: 'https://keycloak.example.com/realms/master/.well-known/openid-configuration',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.OIDC_CLIENT_ID).toBe('WWMate')
        expect(result.data.OIDC_CLIENT_SECRET).toBe('super-secret')
        expect(result.data.OIDC_DISCOVERY_URL).toBe('https://keycloak.example.com/realms/master/.well-known/openid-configuration')
        expect(result.data.OIDC_PROVIDER_NAME).toBe('SSO') // default
      }
    })

    it('accepts custom OIDC_PROVIDER_NAME', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_CLIENT_ID: 'WWMate',
        OIDC_CLIENT_SECRET: 'super-secret',
        OIDC_DISCOVERY_URL: 'https://keycloak.example.com/realms/master/.well-known/openid-configuration',
        OIDC_PROVIDER_NAME: 'Company SSO',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.OIDC_PROVIDER_NAME).toBe('Company SSO')
      }
    })
  })

  describe('no OIDC vars set (opt-out)', () => {
    it('accepts config without any OIDC vars', () => {
      const result = envSchema.safeParse(baseEnv)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.OIDC_CLIENT_ID).toBeUndefined()
        expect(result.data.OIDC_CLIENT_SECRET).toBeUndefined()
        expect(result.data.OIDC_DISCOVERY_URL).toBeUndefined()
      }
    })

    it('rejects empty strings rather than treating as unset', () => {
      // Empty strings go through emptyToUndefined â†’ undefined â†’ fails z.string()
      // This is correct defensive behavior: partial/empty config is rejected.
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_CLIENT_ID: '',
        OIDC_CLIENT_SECRET: '  ',
        OIDC_DISCOVERY_URL: '',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('partial OIDC config (misconfiguration)', () => {
    it('rejects when only OIDC_CLIENT_ID is set', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_CLIENT_ID: 'WWMate',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message)
        expect(messages.some(m => m.includes('OIDC_CLIENT_SECRET'))).toBe(true)
        expect(messages.some(m => m.includes('OIDC_DISCOVERY_URL'))).toBe(true)
      }
    })

    it('rejects when only OIDC_CLIENT_SECRET is set', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_CLIENT_SECRET: 'secret',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message)
        expect(messages.some(m => m.includes('OIDC_CLIENT_ID'))).toBe(true)
        expect(messages.some(m => m.includes('OIDC_DISCOVERY_URL'))).toBe(true)
      }
    })

    it('rejects when only OIDC_DISCOVERY_URL is set', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_DISCOVERY_URL: 'https://keycloak.example.com/realms/master/.well-known/openid-configuration',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message)
        expect(messages.some(m => m.includes('OIDC_CLIENT_ID'))).toBe(true)
        expect(messages.some(m => m.includes('OIDC_CLIENT_SECRET'))).toBe(true)
      }
    })

    it('rejects when OIDC_DISCOVERY_URL is missing but others are set', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_CLIENT_ID: 'WWMate',
        OIDC_CLIENT_SECRET: 'secret',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message)
        expect(messages.some(m => m.includes('OIDC_DISCOVERY_URL'))).toBe(true)
        // Should NOT complain about the vars that ARE set
        expect(messages.some(m => m.startsWith('OIDC_CLIENT_ID is required'))).toBe(false)
        expect(messages.some(m => m.startsWith('OIDC_CLIENT_SECRET is required'))).toBe(false)
      }
    })
  })

  describe('OIDC_DISCOVERY_URL validation', () => {
    it('rejects non-URL discovery URL', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_CLIENT_ID: 'WWMate',
        OIDC_CLIENT_SECRET: 'secret',
        OIDC_DISCOVERY_URL: 'not-a-url',
      })

      expect(result.success).toBe(false)
    })

    it('accepts various OIDC provider discovery URLs', () => {
      const urls = [
        'https://keycloak.example.com/realms/master/.well-known/openid-configuration',
        'https://authentik.example.com/application/o/WWMate/.well-known/openid-configuration',
        'https://login.microsoftonline.com/tenant-id/v2.0/.well-known/openid-configuration',
        'https://accounts.google.com/.well-known/openid-configuration',
      ]

      for (const url of urls) {
        const result = envSchema.safeParse({
          ...baseEnv,
          OIDC_CLIENT_ID: 'WWMate',
          OIDC_CLIENT_SECRET: 'secret',
          OIDC_DISCOVERY_URL: url,
        })

        expect(result.success, `Expected ${url} to be accepted`).toBe(true)
      }
    })
  })

  describe('OIDC_PROVIDER_NAME defaults', () => {
    it('defaults to "SSO" when OIDC vars are set but name is omitted', () => {
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_CLIENT_ID: 'WWMate',
        OIDC_CLIENT_SECRET: 'secret',
        OIDC_DISCOVERY_URL: 'https://keycloak.example.com/realms/master/.well-known/openid-configuration',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.OIDC_PROVIDER_NAME).toBe('SSO')
      }
    })

    it('rejects empty string for provider name', () => {
      // Empty string â†’ emptyToUndefined â†’ undefined â†’ falls through to default.
      // But the preprocess inner z.string() rejects undefined, so this fails.
      const result = envSchema.safeParse({
        ...baseEnv,
        OIDC_CLIENT_ID: 'WWMate',
        OIDC_CLIENT_SECRET: 'secret',
        OIDC_DISCOVERY_URL: 'https://keycloak.example.com/realms/master/.well-known/openid-configuration',
        OIDC_PROVIDER_NAME: '',
      })

      expect(result.success).toBe(false)
    })
  })
})

