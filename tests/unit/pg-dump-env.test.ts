import { describe, it, expect } from 'vitest'
import { buildPgDumpEnv } from '../../server/utils/pgDumpEnv'

/**
 * Regression test for the pg_dump-spawning code in
 * server/api/updates/backup.post.ts. Before the fix the route spread the
 * full parent env into the child, which would have leaked every WWMate
 * secret (BETTER_AUTH_SECRET, S3_SECRET_KEY, OAuth keys, Sentry DSN, etc.)
 * through any pg_dump or libpq diagnostic written to stderr.
 */
describe('buildPgDumpEnv', () => {
  const SECRET_VARS = [
    'BETTER_AUTH_SECRET',
    'S3_SECRET_KEY',
    'S3_ACCESS_KEY',
    'AUTH_GOOGLE_CLIENT_SECRET',
    'AUTH_GITHUB_CLIENT_SECRET',
    'AUTH_MICROSOFT_CLIENT_SECRET',
    'OIDC_CLIENT_SECRET',
    'CRON_SECRET',
    'RESEND_API_KEY',
    'SMTP_PASS',
    'GITHUB_FEEDBACK_TOKEN',
    'SENTRY_DSN',
    'POSTHOG_PUBLIC_KEY',
  ]

  function makeParentEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
      PATH: '/usr/local/bin:/usr/bin',
      HOME: '/home/WWMate',
      LANG: 'en_US.UTF-8',
      TZ: 'UTC',
    }
    for (const key of SECRET_VARS) env[key] = `secret-value-${key}`
    return env
  }

  it('drops every application secret from the parent env', () => {
    const childEnv = buildPgDumpEnv(makeParentEnv(), 'pgpass')

    for (const secret of SECRET_VARS) {
      expect(childEnv).not.toHaveProperty(secret)
    }
  })

  it('forwards PGPASSWORD verbatim so pg_dump can authenticate', () => {
    const childEnv = buildPgDumpEnv(makeParentEnv(), 'super-secret-pg-password')
    expect(childEnv.PGPASSWORD).toBe('super-secret-pg-password')
  })

  it('omits PGPASSWORD when password is empty (trust auth / ~/.pgpass)', () => {
    const childEnv = buildPgDumpEnv(makeParentEnv(), '')
    expect(childEnv).not.toHaveProperty('PGPASSWORD')
  })

  it('forwards a minimal whitelist of system vars (PATH, HOME, locale, TZ)', () => {
    const childEnv = buildPgDumpEnv(makeParentEnv(), 'pw')

    expect(childEnv.PATH).toBe('/usr/local/bin:/usr/bin')
    expect(childEnv.HOME).toBe('/home/WWMate')
    expect(childEnv.LANG).toBe('en_US.UTF-8')
    expect(childEnv.TZ).toBe('UTC')
  })

  it('omits whitelisted vars that are missing from the parent env', () => {
    // Parent only has PATH; LC_ALL/LC_CTYPE/TMPDIR must not appear as
    // empty strings or as the literal "undefined".
    const childEnv = buildPgDumpEnv({ PATH: '/bin' }, 'pw')

    expect(childEnv.PATH).toBe('/bin')
    expect(childEnv).not.toHaveProperty('LC_ALL')
    expect(childEnv).not.toHaveProperty('LC_CTYPE')
    expect(childEnv).not.toHaveProperty('TMPDIR')
    expect(childEnv).not.toHaveProperty('HOME')
  })

  it('keeps the child env compact â€” only the allowlist plus PGPASSWORD', () => {
    const childEnv = buildPgDumpEnv(makeParentEnv(), 'pw')
    const allowed = new Set([
      'PGPASSWORD',
      'PATH', 'HOME', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TZ', 'TMPDIR',
    ])
    for (const key of Object.keys(childEnv)) {
      expect(allowed.has(key)).toBe(true)
    }
  })

  it('does not mutate the parent env (defensive â€” avoids surprises in callers)', () => {
    const parent = makeParentEnv()
    const before = { ...parent }
    buildPgDumpEnv(parent, 'pw')
    expect(parent).toEqual(before)
  })
})

