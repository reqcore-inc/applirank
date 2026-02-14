import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from '../utils/db'

export default defineNitroPlugin(async () => {
  // Advisory lock ID — prevents concurrent migration runs across instances.
  // The lock is automatically released when the transaction/session ends.
  const MIGRATION_LOCK_ID = 123456789

  try {
    // pg_try_advisory_lock returns true if lock acquired, false if another process holds it
    const [{ locked }] = await db.execute<{ locked: boolean }>(
      `SELECT pg_try_advisory_lock(${MIGRATION_LOCK_ID}) as locked`
    )

    if (!locked) {
      console.log('[Applirank] Another instance is running migrations, skipping')
      return
    }

    console.log('[Applirank] Running database migrations...')
    await migrate(db, {
      migrationsFolder: './server/database/migrations',
    })
    console.log('[Applirank] Database migrations applied successfully')
  } catch (error) {
    console.error('[Applirank] Migration failed:', error)
    throw error
  } finally {
    await db.execute(
      `SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID})`
    ).catch(() => {})
  }
})
