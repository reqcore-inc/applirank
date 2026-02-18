---
name: 'Drizzle Schema & Database'
description: 'Drizzle ORM schema definitions, relations, queries, and migration patterns for Applirank (PostgreSQL 16 + postgres.js driver)'
applyTo: 'server/database/**,server/utils/db.ts,drizzle.config.ts,server/plugins/migrations.ts,server/api/**'
---

# Drizzle ORM — Schema, Queries & Migrations

Applirank uses **Drizzle ORM v0.45+** with the **`postgres` (postgres.js)** driver against **PostgreSQL 16**.
This is a **multi-tenant ATS** — every domain table is scoped to an `organizationId`.

Reference docs:
- [Column types](https://orm.drizzle.team/docs/column-types/pg)
- [Relations](https://orm.drizzle.team/docs/relations)
- [Indexes & constraints](https://orm.drizzle.team/docs/indexes-constraints)
- [Relational queries](https://orm.drizzle.team/docs/rqb)
- [Select](https://orm.drizzle.team/docs/select) · [Insert](https://orm.drizzle.team/docs/insert) · [Update](https://orm.drizzle.team/docs/update) · [Delete](https://orm.drizzle.team/docs/delete)

---

## 1. Infrastructure — How the Database Layer is Wired

### Connection — `server/utils/db.ts`
```ts
import { drizzle } from 'drizzle-orm/postgres-js'   // ← THIS driver, always
import postgres from 'postgres'                       // ← THIS library, always
import * as schema from '../database/schema'
import { env } from './env'

const client = postgres(env.DATABASE_URL, { max: 10, idle_timeout: 20, connect_timeout: 10 })
export const db = drizzle(client, { schema })
```
- `db` is auto-imported in server context (Nitro auto-imports `server/utils/`).
- **NEVER** import from `drizzle-orm/node-postgres`, `drizzle-orm/neon-serverless`, `drizzle-orm/pg`, or use the `pg` / `@neondatabase/serverless` packages.

### Drizzle config — `drizzle.config.ts`
```ts
export default defineConfig({
  schema: './server/database/schema/index.ts',
  out: './server/database/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

### Migrations — `server/plugins/migrations.ts`
- Runs on every server startup via a Nitro plugin.
- Uses an advisory lock (`pg_try_advisory_lock`) so concurrent instances don't race.
- After changing a schema → run `npm run db:generate` → migration auto-applies on next `npm run dev`.

---

## 2. Schema Files — Where Things Live

| File | Purpose | Editable? |
|------|---------|-----------|
| `server/database/schema/auth.ts` | Better Auth tables: `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation` + their relations | **NO** — managed by Better Auth. Do not add, remove, or rename columns. |
| `server/database/schema/app.ts` | ATS domain tables: `job`, `candidate`, `application`, `document` + enums + relations | **YES** — add new domain tables here or create new files. |
| `server/database/schema/index.ts` | Re-exports all schema files: `export * from './auth'` and `export * from './app'` | Update when adding a new schema file. |

---

## 3. Table Definition Patterns

### Primary key — UUID text, generated at runtime
```ts
id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
```
- Uses `$defaultFn` so the UUID is generated in JS, not in SQL. This lets Drizzle know the value at insert time.
- **NEVER** use `serial`, `integer().primaryKey()`, `bigserial`, `uuid().defaultRandom()`, `nanoid`, or `cuid`.

### Organization scope — MANDATORY on every domain table
```ts
organizationId: text('organization_id')
  .notNull()
  .references(() => organization.id, { onDelete: 'cascade' }),
```
- Import `organization` from `./auth`.
- `onDelete: 'cascade'` — deleting an org purges all its data.
- **NEVER** create a domain table without this column.

### Timestamps
```ts
createdAt: timestamp('created_at').notNull().defaultNow(),
updatedAt: timestamp('updated_at').notNull().defaultNow(),
```
- Use `timestamp()` without `withTimezone` (the project convention is `timestamp without time zone`).
- Use `defaultNow()` — not `default(sql\`now()\`)` (both work, but `defaultNow()` is the project convention).
- `updatedAt` does not auto-update — you must set it explicitly in update queries: `.set({ updatedAt: new Date() })`.

### Column naming
- **Database columns**: `snake_case` — `organization_id`, `created_at`, `first_name`
- **JS/TS fields**: `camelCase` — `organizationId`, `createdAt`, `firstName`
- The first argument to the column builder is the **database column name**: `text('organization_id')`.

### Indexes
```ts
// Third argument to pgTable — returns an array of indexes
(t) => ([
  index('tablename_organization_id_idx').on(t.organizationId),
  index('tablename_foreign_key_idx').on(t.foreignKeyColumn),
])
```
- Index naming: `{tablename}_{column}_idx`
- **ALWAYS** index `organizationId`.
- **ALWAYS** index foreign key columns.
- Use `uniqueIndex` for composite uniqueness constraints: `uniqueIndex('name').on(t.col1, t.col2)`.

### Enums
```ts
export const statusEnum = pgEnum('status_name', ['value1', 'value2', 'value3'])
// In table:
status: statusEnum('status').notNull().default('value1'),
```
- Define enums BEFORE the tables that use them.
- Enum DB name should be `snake_case`.

### Foreign keys
```ts
candidateId: text('candidate_id')
  .notNull()
  .references(() => candidate.id, { onDelete: 'cascade' }),
```
- Use inline `.references()` — not the standalone `foreignKey()` operator (unless you need composite FKs).
- Always specify `onDelete`. Use `'cascade'` for child records that shouldn't outlive the parent.

### JSON columns
```ts
parsedContent: jsonb('parsed_content'),
// With type safety:
metadata: jsonb('metadata').$type<{ skills: string[]; experience: number }>(),
```
- Prefer `jsonb` over `json` — `jsonb` is indexable and more efficient in PostgreSQL.
- Use `.$type<T>()` for compile-time type safety on JSON columns.

---

## 4. Relations — Enabling `db.query.*` API

Every table that participates in relational queries needs a `relations()` export.

### One-to-many (parent side)
```ts
export const jobRelations = relations(job, ({ one, many }) => ({
  organization: one(organization, { fields: [job.organizationId], references: [organization.id] }),
  applications: many(application),
}))
```

### Many-to-one (child side)
```ts
export const applicationRelations = relations(application, ({ one }) => ({
  organization: one(organization, { fields: [application.organizationId], references: [organization.id] }),
  candidate: one(candidate, { fields: [application.candidateId], references: [candidate.id] }),
  job: one(job, { fields: [application.jobId], references: [job.id] }),
}))
```

**Rules:**
- The `one()` side MUST specify `fields` (local FK) and `references` (parent PK).
- The `many()` side does NOT specify fields/references — Drizzle infers them.
- Relation name = export name must be `{tableName}Relations` (e.g., `jobRelations`).
- Relations are application-level only — they don't affect the database schema, but they MUST match the actual foreign keys.

---

## 5. New Table Checklist

When creating a new table, verify ALL of these:

- [ ] `id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID())`
- [ ] `organizationId` with `.references(() => organization.id, { onDelete: 'cascade' })`
- [ ] `createdAt: timestamp('created_at').notNull().defaultNow()`
- [ ] Index on `organizationId`
- [ ] Indexes on all foreign key columns
- [ ] Relations exported in the same file (with `organization: one(organization, ...)` at minimum)
- [ ] Column names are `snake_case`, JS fields are `camelCase`
- [ ] JSDoc comment on the table explaining its purpose
- [ ] Re-exported from `server/database/schema/index.ts` if in a new file
- [ ] Run `npm run db:generate` to create the migration

---

## 6. Query Patterns

### Which API to use

| Use case | API | Example |
|----------|-----|---------|
| Fetching with nested relations | `db.query.*` (relational queries) | `db.query.job.findMany({ with: { applications: true } })` |
| Simple CRUD without relations | Query builder (`db.select`, `db.insert`, etc.) | `db.select().from(job).where(...)` |
| Complex joins, aggregations, subqueries | Query builder | `db.select({ count: count() }).from(job).groupBy(...)` |

### Relational queries (preferred for reads)
```ts
// List with relations — ALWAYS filter by orgId
const jobs = await db.query.job.findMany({
  where: eq(job.organizationId, orgId),
  with: {
    applications: {
      with: { candidate: true },
    },
  },
  orderBy: [desc(job.createdAt)],
  limit: 20,
  offset: 0,
})

// Detail — filter by BOTH id AND orgId
const singleJob = await db.query.job.findFirst({
  where: and(
    eq(job.id, jobId),
    eq(job.organizationId, orgId),
  ),
  with: { applications: true },
})
if (!singleJob) throw createError({ statusCode: 404, statusMessage: 'Not found' })
```

### Insert (always include organizationId)
```ts
const [newJob] = await db.insert(job).values({
  organizationId: orgId,  // FROM SESSION — never from user input
  title: body.title,
  description: body.description,
}).returning()
```

### Update (scope by id AND orgId, set updatedAt)
```ts
const [updated] = await db.update(job)
  .set({
    title: body.title,
    updatedAt: new Date(),
  })
  .where(and(
    eq(job.id, jobId),
    eq(job.organizationId, orgId),
  ))
  .returning()

if (!updated) throw createError({ statusCode: 404, statusMessage: 'Not found' })
```

### Delete (scope by id AND orgId)
```ts
const [deleted] = await db.delete(job)
  .where(and(
    eq(job.id, jobId),
    eq(job.organizationId, orgId),
  ))
  .returning({ id: job.id })

if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Not found' })
```

### Upsert (on conflict)
```ts
await db.insert(candidate)
  .values({ organizationId: orgId, email, firstName, lastName })
  .onConflictDoUpdate({
    target: [candidate.organizationId, candidate.email],  // matches uniqueIndex
    set: { firstName, lastName, updatedAt: new Date() },
  })
  .returning()
```

### Count
```ts
const total = await db.$count(job, eq(job.organizationId, orgId))
```

### Partial select (only specific columns)
```ts
const names = await db.query.candidate.findMany({
  columns: { id: true, firstName: true, lastName: true, email: true },
  where: eq(candidate.organizationId, orgId),
})
```

### Filter operators
Import from `'drizzle-orm'`:
```ts
import { eq, ne, gt, gte, lt, lte, like, ilike, and, or, not, inArray, isNull, isNotNull, between, sql } from 'drizzle-orm'
```

---

## 7. Type Inference

```ts
// Infer insert type (what you pass to .values())
type NewJob = typeof job.$inferInsert

// Infer select type (what you get back from queries)
type Job = typeof job.$inferSelect
```

Use these when typing function parameters or composable return types. Do NOT manually duplicate the column types.

---

## 8. Migration Workflow

1. Edit schema files in `server/database/schema/`
2. Run `npm run db:generate` — creates a new `.sql` file in `server/database/migrations/`
3. Review the generated SQL
4. Migration auto-applies on next `npm run dev` (via `server/plugins/migrations.ts`)
5. For production: migrations apply on server startup with advisory lock protection

**Commands:**
- `npm run db:generate` — generate migration from schema diff
- `npm run db:migrate` — apply migrations via drizzle-kit (alternative to auto-apply)
- `npm run db:push` — push schema directly (dev only, no migration file)
- `npm run db:studio` — open Drizzle Studio GUI

---

## 9. Existing Schema Reference

### Enums (defined in `app.ts`)
| Enum | Values |
|------|--------|
| `jobStatusEnum` | `draft`, `open`, `closed`, `archived` |
| `jobTypeEnum` | `full_time`, `part_time`, `contract`, `internship` |
| `applicationStatusEnum` | `new`, `screening`, `interview`, `offer`, `hired`, `rejected` |
| `documentTypeEnum` | `resume`, `cover_letter`, `other` |

### Domain tables (in `app.ts`)
| Table | Key columns | Unique constraints |
|-------|------------|-------------------|
| `job` | `organizationId`, `title`, `description`, `location`, `type`, `status`, `slug`, `salaryMin`, `salaryMax`, `salaryCurrency`, `salaryUnit`, `remoteStatus`, `validThrough` | `slug` |
| `candidate` | `organizationId`, `firstName`, `lastName`, `email`, `phone` | `(organizationId, email)` |
| `application` | `organizationId`, `candidateId`, `jobId`, `status`, `score`, `notes` | — |
| `document` | `organizationId`, `candidateId`, `type`, `storageKey`, `originalFilename`, `mimeType`, `sizeBytes`, `parsedContent` | `storageKey` |
| `jobQuestion` | `organizationId`, `jobId`, `label`, `fieldType`, `required`, `placeholder`, `helpText`, `options`, `validationRules`, `displayOrder` | — |
| `questionResponse` | `organizationId`, `applicationId`, `jobQuestionId`, `value` | — |

The `job` table includes SEO-relevant fields:
- `salaryMin`, `salaryMax` (integer) — salary range for JSON-LD `baseSalary`
- `salaryCurrency` (text, e.g., `USD`) — ISO 4217 currency code
- `salaryUnit` (text, enum: `YEAR`/`MONTH`/`HOUR`) — pay period
- `remoteStatus` (text, enum: `remote`/`hybrid`/`onsite`) — maps to Schema.org `jobLocationType`
- `validThrough` (timestamp) — job posting expiry date for JSON-LD

### Auth tables (in `auth.ts` — DO NOT MODIFY)
`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`

---

## 10. NEVER Do These

| Anti-pattern | Why | Do this instead |
|-------------|-----|-----------------|
| Use `serial`/`integer` primary keys | Project convention is text UUIDs | `text('id').primaryKey().$defaultFn(() => crypto.randomUUID())` |
| Use `pg` or `@neondatabase/serverless` driver | Project uses `postgres` (postgres.js) exclusively | `import postgres from 'postgres'` |
| Use `drizzle-orm/node-postgres` | Wrong driver adapter | `import { drizzle } from 'drizzle-orm/postgres-js'` |
| Create a domain table without `organizationId` | Multi-tenancy violation — data leak risk | Always add `organizationId` FK to `organization.id` |
| Modify `auth.ts` tables directly | Better Auth manages these schemas | Only change auth config in `server/utils/auth.ts` |
| Query without org scope | Cross-tenant data leak | Always include `eq(table.organizationId, orgId)` in WHERE |
| Get `orgId` from request body/params | Tenant spoofing attack | Get from `session.session.activeOrganizationId` |
| Use `process.env.DATABASE_URL` in server code | Env vars must go through Zod validation | Import `env` from `server/utils/env.ts` |
| Use raw SQL for schema changes | Loses type safety and migration tracking | Use Drizzle's schema API + `npm run db:generate` |
| Forget to index foreign keys | Slow queries on joins and cascading deletes | Add `index('name').on(t.column)` for every FK |
| Use `uuid()` column type with `.defaultRandom()` | Project convention is `text` with JS-side `crypto.randomUUID()` | Stick with `text('id').primaryKey().$defaultFn(...)` |
| Use `json()` when `jsonb()` would work | `json` is stored as text, can't be indexed | Use `jsonb()` for structured data |
| Use `getTableColumns` | Deprecated in Drizzle v1.0 beta | Use `getColumns` from `drizzle-orm` (v1.0+) — or stick with `db.query.*` |

---

## 11. Complete New Table Example

```ts
// In server/database/schema/app.ts

import { pgTable, text, timestamp, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { organization } from './auth'
import { candidate } from './app'  // if referencing another domain table

export const interviewStageEnum = pgEnum('interview_stage', ['phone_screen', 'technical', 'onsite', 'final'])

/**
 * Interview records — tracks scheduled and completed interviews
 * for candidates within an organization.
 */
export const interview = pgTable('interview', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  candidateId: text('candidate_id').notNull().references(() => candidate.id, { onDelete: 'cascade' }),
  stage: interviewStageEnum('stage').notNull().default('phone_screen'),
  scheduledAt: timestamp('scheduled_at').notNull(),
  notes: text('notes'),
  score: integer('score'),
  feedback: jsonb('feedback').$type<{ strengths: string[]; concerns: string[] }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  index('interview_organization_id_idx').on(t.organizationId),
  index('interview_candidate_id_idx').on(t.candidateId),
]))

export const interviewRelations = relations(interview, ({ one }) => ({
  organization: one(organization, { fields: [interview.organizationId], references: [organization.id] }),
  candidate: one(candidate, { fields: [interview.candidateId], references: [candidate.id] }),
}))
```

Then update `server/database/schema/index.ts` if this is in a new file, and run `npm run db:generate`.