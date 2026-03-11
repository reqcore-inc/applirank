/**
 * Backfills google_calendar_event_link for interviews that already have
 * a google_calendar_event_id but are missing the direct link.
 *
 * This is a one-time fix for interviews created before migration 0015
 * added the google_calendar_event_link column.
 *
 * Usage: npx tsx server/scripts/backfill-calendar-links.ts
 * Requires DATABASE_URL in .env or shell environment.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { and, isNotNull, isNull, eq } from 'drizzle-orm'
import { google } from 'googleapis'
import { decrypt } from '../utils/encryption'
import * as schema from '../database/schema'

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const processWithLoadEnv = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void
}
if (typeof processWithLoadEnv.loadEnvFile === 'function') {
  try { processWithLoadEnv.loadEnvFile('.env') } catch {}
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not set')
  process.exit(1)
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'https://reqcore.com'

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !BETTER_AUTH_SECRET) {
  console.error('ERROR: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and BETTER_AUTH_SECRET are required')
  process.exit(1)
}

const client = postgres(connectionString, { max: 1 })
const db = drizzle(client, { schema })

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  console.log('Fetching interviews missing google_calendar_event_link…')

  const interviews = await db
    .select({
      id: schema.interview.id,
      googleCalendarEventId: schema.interview.googleCalendarEventId,
      createdById: schema.interview.createdById,
    })
    .from(schema.interview)
    .where(
      and(
        isNotNull(schema.interview.googleCalendarEventId),
        isNull(schema.interview.googleCalendarEventLink),
      ),
    )

  if (interviews.length === 0) {
    console.log('No interviews need backfilling. Done.')
    return
  }

  console.log(`Found ${interviews.length} interview(s) to backfill.`)

  const redirectUri = `${BETTER_AUTH_URL}/api/calendar/google/callback`

  // Cache calendar clients per userId to avoid redundant token fetches
  const clientCache = new Map<string, ReturnType<typeof google.calendar> | null>()

  async function getCalandarClientForUser(userId: string) {
    if (clientCache.has(userId)) return clientCache.get(userId)!

    const integration = await db.query.calendarIntegration.findFirst({
      where: eq(schema.calendarIntegration.userId, userId),
    })

    if (!integration) {
      clientCache.set(userId, null)
      return null
    }

    const accessToken = decrypt(integration.accessTokenEncrypted, BETTER_AUTH_SECRET!)
    const refreshToken = decrypt(integration.refreshTokenEncrypted, BETTER_AUTH_SECRET!)

    if (!accessToken || !refreshToken) {
      clientCache.set(userId, null)
      return null
    }

    const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri)
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

    const cal = google.calendar({ version: 'v3', auth: oauth2Client })
    clientCache.set(userId, cal)
    return cal
  }

  let updated = 0
  let failed = 0

  for (const iv of interviews) {
    try {
      const cal = await getCalandarClientForUser(iv.createdById)
      if (!cal) {
        console.warn(`  [SKIP] ${iv.id} — no calendar integration for user ${iv.createdById}`)
        failed++
        continue
      }

      const integration = await db.query.calendarIntegration.findFirst({
        where: eq(schema.calendarIntegration.userId, iv.createdById),
        columns: { calendarId: true },
      })
      const calendarId = integration?.calendarId || 'primary'

      const response = await cal.events.get({
        calendarId,
        eventId: iv.googleCalendarEventId!,
        fields: 'htmlLink',
      })

      const htmlLink = response.data.htmlLink
      if (!htmlLink) {
        console.warn(`  [SKIP] ${iv.id} — event had no htmlLink`)
        failed++
        continue
      }

      await db.update(schema.interview)
        .set({ googleCalendarEventLink: htmlLink })
        .where(eq(schema.interview.id, iv.id))

      console.log(`  [OK] ${iv.id} → ${htmlLink}`)
      updated++
    }
    catch (err: any) {
      console.error(`  [ERROR] ${iv.id} — ${err?.message ?? err}`)
      failed++
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped/Failed: ${failed}`)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => client.end())
