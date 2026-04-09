import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../../server/utils/encryption'

/**
 * Tests for AI config encryption — directly addresses issue #130:
 * "AI settings do not survive the docker rebuild."
 *
 * If BETTER_AUTH_SECRET changes between Docker rebuilds,
 * all encrypted API keys become unreadable.
 */
describe('AI config encryption', () => {
  const secret = 'test-secret-that-is-long-enough'
  const altSecret = 'different-secret-after-rebuild'

  it('round-trips an API key through encrypt → decrypt', () => {
    const apiKey = 'sk-test-1234567890'
    const encrypted = encrypt(apiKey, secret)
    const decrypted = decrypt(encrypted, secret)

    expect(decrypted).toBe(apiKey)
  })

  it('returns null when decrypting with a different secret (simulates BETTER_AUTH_SECRET change)', () => {
    const apiKey = 'sk-test-1234567890'
    const encrypted = encrypt(apiKey, secret)
    const decrypted = decrypt(encrypted, altSecret)

    expect(decrypted).toBeNull()
  })

  it('returns null for corrupted ciphertext', () => {
    const decrypted = decrypt('not-valid-base64!!', secret)
    expect(decrypted).toBeNull()
  })

  it('returns null for too-short ciphertext', () => {
    const decrypted = decrypt(Buffer.from('short').toString('base64'), secret)
    expect(decrypted).toBeNull()
  })

  it('produces different ciphertexts for the same plaintext (unique IVs)', () => {
    const apiKey = 'sk-test-1234567890'
    const encrypted1 = encrypt(apiKey, secret)
    const encrypted2 = encrypt(apiKey, secret)

    expect(encrypted1).not.toBe(encrypted2)
    // But both should decrypt to the same value
    expect(decrypt(encrypted1, secret)).toBe(apiKey)
    expect(decrypt(encrypted2, secret)).toBe(apiKey)
  })
})
