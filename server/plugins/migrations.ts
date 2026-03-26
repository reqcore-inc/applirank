import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from '../utils/db'

export default defineNitroPlugin(async () => {
  // Skip during build-time prerendering — database isn't available
  if (import.meta.prerender) return

  // Railway handles schema sync via preDeploy commands.
  // Running runtime migrations there can conflict with drizzle-kit push/migrate.
  if (process.env.RAILWAY_ENVIRONMENT_ID) {
    console.log('[Reqcore] Skipping runtime migrations on Railway (handled in preDeploy)')
    logInfo('migrations.skipped_railway')
    return
  }

  // Advisory lock ID — prevents concurrent migration runs across instances.
  // The lock is automatically released when the transaction/session ends.
  const MIGRATION_LOCK_ID = 123456789

  try {
    // pg_try_advisory_lock returns true if lock acquired, false if another process holds it
    const lockResult = await db.execute<{ locked: boolean }>(
      `SELECT pg_try_advisory_lock(${MIGRATION_LOCK_ID}) as locked`
    )
    const locked = lockResult[0]?.locked ?? false

    if (!locked) {
      console.log('[Reqcore] Another instance is running migrations, skipping')
      logInfo('migrations.skipped_locked')
      return
    }

    console.log('[Reqcore] Running database migrations...')
    // Suppress harmless NOTICE messages (e.g. "schema already exists, skipping")
    await db.execute(`SET client_min_messages TO warning`)
    await migrate(db, {
      migrationsFolder: './server/database/migrations',
    })
    await db.execute(`SET client_min_messages TO notice`)
    console.log('[Reqcore] Database migrations applied successfully')
    logInfo('migrations.completed')
  } catch (error) {
    console.error('[Reqcore] Migration failed:', error)
    logError('migrations.failed', {
      error_message: error instanceof Error ? error.message : String(error),
    })
    throw error
  } finally {
    await db.execute(
      `SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID})`
    ).catch(() => {})
  }
})
