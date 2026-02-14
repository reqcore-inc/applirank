import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'
import { env } from './env'

const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client, { schema })

/**
 * Gracefully close all connections on shutdown.
 * Prevents leaked pools during dev HMR and ensures clean prod teardown.
 */
function shutdown() {
  client.end({ timeout: 5 }).catch(() => {})
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
