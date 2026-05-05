/**
 * AES-256-GCM encryption for sensitive data at rest (OAuth tokens, API keys).
 *
 * Uses HKDF-SHA-256 to derive a 256-bit encryption key from the application
 * secret with a fixed info label ("WWMate-aes-256-gcm-v1"). This ensures the
 * AES key is cryptographically distinct from the raw BETTER_AUTH_SECRET used
 * by Better Auth for session signing â€” re-using the same key across different
 * primitives weakens both.
 *
 * Each encryption produces a unique random IV (12 bytes) and auth tag (16 bytes).
 * Format: base64(iv + authTag + ciphertext)
 *
 * â”€â”€ Key migration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Prior to this version, deriveKey() used SHA-256(secret) directly.
 * The new HKDF derivation produces a different key, so `decrypt()` tries the
 * new key first and falls back to the legacy SHA-256 key transparently.
 * On a successful legacy decrypt, callers should re-encrypt with the current
 * key. Existing data is never silently lost.
 */
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

/**
 * Derive a 256-bit AES encryption key from the application secret using HKDF.
 * The info label scopes this key exclusively to AES-256-GCM encryption,
 * making it cryptographically independent from any other key derived from
 * the same secret (e.g. session signing keys used by Better Auth).
 */
function deriveKey(secret: string): Buffer {
  return Buffer.from(
    hkdfSync('sha256', secret, '', 'WWMate-aes-256-gcm-v1', 32),
  )
}

/**
 * Legacy key derivation (SHA-256) used before HKDF was introduced.
 * Retained only for backwards-compatible decryption of existing ciphertext.
 * New encryptions always use `deriveKey()`.
 */
function deriveKeyLegacy(secret: string): Buffer {
  return createHash('sha256').update(secret).digest()
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: IV (12B) + AuthTag (16B) + Ciphertext.
 */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Pack: IV + AuthTag + Ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt a base64-encoded AES-256-GCM ciphertext.
 * Expects format: base64(IV + AuthTag + Ciphertext).
 *
 * Tries the current HKDF-derived key first. If that fails (likely because the
 * value was encrypted before the HKDF migration), transparently retries with
 * the legacy SHA-256-derived key so existing data continues to work.
 *
 * Returns null if both keys fail (tampered data or unrecognised format).
 */
export function decrypt(encryptedBase64: string, secret: string): string | null {
  const result = _decryptWithKey(encryptedBase64, deriveKey(secret))
  if (result !== null) return result

  // Fallback: try the pre-HKDF key for data encrypted before this migration.
  const legacy = _decryptWithKey(encryptedBase64, deriveKeyLegacy(secret))
  if (legacy !== null) {
    // Log so operators can track migration progress and eventually retire this path.
    console.warn('[encryption] Decrypted with legacy SHA-256 key â€” value should be re-encrypted with the current HKDF key.')
  }
  return legacy
}

function _decryptWithKey(encryptedBase64: string, key: Buffer): string | null {
  try {
    const combined = Buffer.from(encryptedBase64, 'base64')

    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      return null
    }

    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ])

    return decrypted.toString('utf-8')
  }
  catch {
    return null
  }
}

