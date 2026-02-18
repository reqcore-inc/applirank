import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  DeleteBucketPolicyCommand,
} from '@aws-sdk/client-s3'

// ─────────────────────────────────────────────
// S3-compatible client for document storage
// ─────────────────────────────────────────────

let _s3Client: S3Client | undefined

/**
 * Lazily-initialized S3-compatible client for MinIO (local dev) or Railway Buckets (production).
 * The client is created on first access — not at import time — so build-time
 * prerendering doesn't crash when S3 env vars aren't available.
 *
 * `forcePathStyle` is controlled by `S3_FORCE_PATH_STYLE` env var:
 * - `true` (default) — required for MinIO (path-style URLs)
 * - `false` — required for Railway Buckets / AWS S3 (virtual-hosted-style URLs)
 */
export function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    })
  }
  return _s3Client
}

/** @deprecated Use `getS3Client()` — kept for backward compatibility */
export const s3Client = new Proxy({} as S3Client, {
  get(_, prop: string | symbol) {
    const instance = getS3Client()
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as Function).bind(instance) : value
  },
})

/**
 * Upload a file to S3/MinIO.
 *
 * @param key - Server-generated storage key (e.g. `{orgId}/{candidateId}/{docId}.pdf`)
 * @param body - File content as Buffer or Uint8Array
 * @param contentType - Validated MIME type of the file
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

/**
 * Delete a file from S3/MinIO.
 * Silently succeeds if the object doesn't exist (S3 convention).
 *
 * @param key - The storage key of the object to delete
 */
export async function deleteFromS3(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
  )
}

/**
 * Check if the configured bucket exists.
 * @returns true if the bucket exists and is accessible
 */
export async function bucketExists(): Promise<boolean> {
  try {
    await getS3Client().send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }))
    return true
  } catch {
    return false
  }
}

/**
 * Create the configured bucket if it doesn't exist, then enforce
 * private access by deleting any public policy. Idempotent — safe
 * to call repeatedly.
 *
 * Security: MinIO buckets without a policy are private by default.
 * We delete any existing policy to ensure no accidental public access.
 */
export async function ensureBucketExists(): Promise<void> {
  if (!(await bucketExists())) {
    await getS3Client().send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }))
  }

  // Always enforce private policy (idempotent)
  await enforcePrivateBucketPolicy()
}

/**
 * Set the bucket to private by removing any public policy.
 * MinIO buckets are private by default — this ensures no public
 * policy was added manually via the MinIO console.
 *
 * Note: We delete the bucket policy rather than setting a Deny rule
 * because MinIO doesn't support AWS-specific condition keys like
 * `aws:PrincipalType`. A bucket with no policy is private by default.
 */
async function enforcePrivateBucketPolicy(): Promise<void> {
  try {
    await getS3Client().send(
      new DeleteBucketPolicyCommand({ Bucket: env.S3_BUCKET }),
    )
  } catch (error: unknown) {
    // Ignore "no policy exists" errors — that's the desired state
    if (error instanceof Error && 'name' in error && error.name === 'NoSuchBucketPolicy') {
      return
    }
    throw error
  }
}
