/**
 * Ensures the S3 bucket exists and is configured as private on startup.
 * Runs after migrations plugin. Idempotent â€” safe to run repeatedly.
 *
 * On managed providers (Railway Buckets, AWS S3), buckets are pre-provisioned
 * and always private â€” bucket creation and policy management are skipped.
 * This is detected via S3_FORCE_PATH_STYLE=false (managed providers use
 * virtual-hosted-style URLs).
 */
export default defineNitroPlugin(async () => {
  // Skip during build-time prerendering â€” S3 isn't available
  if (import.meta.prerender) return

  // Managed S3 providers (Railway Buckets, AWS S3) pre-provision buckets
  // and enforce privacy at the platform level â€” skip bucket initialization
  if (!env.S3_FORCE_PATH_STYLE) {
    console.log(`[WWMate] S3 bucket "${env.S3_BUCKET}" â€” managed provider detected, skipping initialization`)
    logInfo('s3.managed_provider_detected', { bucket: env.S3_BUCKET })
    return
  }

  try {
    await ensureBucketExists()
    console.log(`[WWMate] S3 bucket "${env.S3_BUCKET}" is ready`)
    logInfo('s3.bucket_ready', { bucket: env.S3_BUCKET })
  } catch (error) {
    console.error(`[WWMate] Failed to initialize S3 bucket "${env.S3_BUCKET}":`, error)
    logError('s3.bucket_init_failed', {
      bucket: env.S3_BUCKET,
      error_message: error instanceof Error ? error.message : String(error),
    })
    // Don't throw â€” the app can still start, but uploads will fail.
    // This allows the app to boot even if MinIO is temporarily unavailable.
  }
})

