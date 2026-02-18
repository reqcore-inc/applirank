---
name: 'Server API Routes & Middleware'
description: 'Nitro/h3 event handlers, request validation with Zod v4, auth session guards, and multi-tenant API patterns for Applirank'
applyTo: 'server/api/**,server/routes/**,server/middleware/**,server/utils/**,server/plugins/**'
---

# Server API — Routes, Validation, Auth & Multi-Tenancy

Applirank's server runs on **Nitro** (h3 v1) inside **Nuxt 4**. All server code lives at the project root in `server/`.
This is a **multi-tenant ATS** — every API route that touches domain data MUST scope queries by the authenticated org.

Reference docs:
- [h3 event handlers](https://v1.h3.dev/guide/event-handler)
- [h3 request utils](https://v1.h3.dev/utils/request)
- [h3 response utils](https://v1.h3.dev/utils/response)
- [Zod v4 API](https://zod.dev/api)
- [Better Auth Nuxt](https://www.better-auth.com/docs/integrations/nuxt)

---

## 1. Server Directory Structure

```
server/
├── api/                     # API routes (prefixed with /api/)
│   ├── auth/
│   │   └── [...all].ts      # Better Auth catch-all handler
│   ├── jobs/
│   │   ├── index.get.ts     # GET /api/jobs
│   │   ├── index.post.ts    # POST /api/jobs
│   │   ├── [id].get.ts      # GET /api/jobs/:id
│   │   ├── [id].patch.ts    # PATCH /api/jobs/:id
│   │   ├── [id].delete.ts   # DELETE /api/jobs/:id
│   │   └── [id]/            # ⚠️ MUST match param name of sibling [id].*.ts files
│   │       └── questions/   # Custom question management per job
│   ├── public/              # Unauthenticated endpoints (no requireAuth)
│   │   └── jobs/
│   │       ├── index.get.ts  # GET /api/public/jobs (list open jobs)
│   │       ├── [slug].get.ts # GET /api/public/jobs/:slug
│   │       └── [slug]/
│   │           └── apply.post.ts # POST /api/public/jobs/:slug/apply
│   ├── __sitemap__/         # Dynamic sitemap source for @nuxtjs/seo
│   │   └── urls.ts          # Returns all open job URLs for sitemap
│   └── candidates/
│       └── ...
├── routes/                  # Non-API routes (no /api/ prefix)
│   └── health.get.ts        # GET /health
├── middleware/               # Global server middleware (runs on EVERY request)
│   └── log.ts
├── plugins/                  # Nitro lifecycle plugins
│   └── migrations.ts         # Auto-run DB migrations on startup
├── database/
│   ├── schema/               # Drizzle ORM schemas
│   └── migrations/           # Generated SQL migrations
└── utils/                    # Auto-imported server utilities
    ├── auth.ts               # Better Auth instance
    ├── db.ts                 # Drizzle client
    └── env.ts                # Zod-validated env vars
```

### File-based routing conventions

| File path | HTTP method | URL |
|-----------|-------------|-----|
| `server/api/jobs/index.get.ts` | GET | `/api/jobs` |
| `server/api/jobs/index.post.ts` | POST | `/api/jobs` |
| `server/api/jobs/[id].get.ts` | GET | `/api/jobs/:id` |
| `server/api/jobs/[id].patch.ts` | PATCH | `/api/jobs/:id` |
| `server/api/jobs/[id].delete.ts` | DELETE | `/api/jobs/:id` |
| `server/routes/health.get.ts` | GET | `/health` (no `/api` prefix) |

- Method suffix in filename (`.get.ts`, `.post.ts`, `.patch.ts`, `.delete.ts`) restricts the HTTP method.
- No suffix = handler receives ALL methods.
- `[param]` for dynamic segments, `[...slug]` for catch-all.
- **CRITICAL**: When a dynamic segment has both leaf files (`[id].get.ts`) AND a subdirectory (`[id]/`), the param name MUST be the same. Using `[id].get.ts` alongside `[jobId]/` causes 404 errors.
- **Public endpoints**: Place unauthenticated API routes under `server/api/public/` to separate them from authenticated routes.
- **Sitemap source**: `server/api/__sitemap__/urls.ts` returns dynamic URLs for the `@nuxtjs/seo` sitemap module. This endpoint queries all open jobs and returns `{ loc, lastmod }` objects.
- **Public job API**: The public job endpoints (`/api/public/jobs`) join the `organization` table to expose `organizationName` in responses. This is used for JSON-LD `hiringOrganization` on the frontend. The `organizationId` itself is never exposed.

---

## 2. Auto-Imported Server Utilities

Everything in `server/utils/` is auto-imported by Nitro. These are available in all server code without `import`:

| Utility | Source | Description |
|---------|--------|-------------|
| `db` | `server/utils/db.ts` | Drizzle ORM client with schema |
| `auth` | `server/utils/auth.ts` | Better Auth instance |
| `env` | `server/utils/env.ts` | Zod-validated environment variables |
| `requireAuth` | `server/utils/requireAuth.ts` | Auth guard — throws 401/403 |
| `generateJobSlug` | `server/utils/slugify.ts` | URL slug generation for public job pages |
| `createRateLimiter` | `server/utils/rateLimit.ts` | IP-based sliding window rate limiter |
| `uploadToS3`, `deleteFromS3`, `s3Client`, `S3_BUCKET` | `server/utils/s3.ts` | MinIO/S3 file operations and client |
| `getPresignedDownloadUrl`, `ensureBucketExists` | `server/utils/s3.ts` | Presigned URL generation (internal only) and bucket initialization |

Shared validation schemas in `server/utils/schemas/`:

| Schema file | Key exports |
|-------------|-------------|
| `document.ts` | `ALLOWED_MIME_TYPES`, `MAX_FILE_SIZE`, `MAX_DOCUMENTS_PER_CANDIDATE`, `sanitizeFilename()`, `documentTypeSchema` |
| `job.ts` | `createJobSchema`, `updateJobSchema` |
| `candidate.ts` | Candidate validation schemas |
| `application.ts` | Application validation schemas |
| `publicApplication.ts` | Public apply form schemas |
| `jobQuestion.ts` | Job question schemas |

h3 utilities (`defineEventHandler`, `readBody`, `getQuery`, `createError`, etc.) are also auto-imported.

**NEVER** use `process.env` directly in server code — always use `env` from `server/utils/env.ts`.

---

## 3. Event Handler Patterns

### Basic handler

```ts
// server/api/health.get.ts
export default defineEventHandler(() => {
  return { status: 'ok', timestamp: Date.now() }
})
```

- Return a JSON-serializable value → auto-serialized with `application/json`.
- Return `null` → sends `204 No Content`.
- Return a `string` → sent with `text/html`.
- Can be `async`:

```ts
export default defineEventHandler(async (event) => {
  const data = await fetchSomething()
  return data
})
```

### Object syntax with lifecycle hooks

Use for routes that need auth guards or request preprocessing:

```ts
// server/api/jobs/index.get.ts
export default defineEventHandler({
  onRequest: [
    // Guards run BEFORE the handler — throw to reject
    async (event) => {
      const session = await requireAuth(event)
      event.context.session = session
    },
  ],
  handler: async (event) => {
    const { session } = event.context
    const orgId = session.session.activeOrganizationId!

    return db.query.job.findMany({
      where: eq(job.organizationId, orgId),
    })
  },
})
```

---

## 4. Authentication — Getting the Session

### How Better Auth works on the server

The `auth` object (from `server/utils/auth.ts`) provides `auth.api.getSession()`:

```ts
const session = await auth.api.getSession({
  headers: event.headers,
})
```

This returns `{ user, session }` or `null`. The session object contains `session.activeOrganizationId`.

### Auth guard utility pattern

Create a reusable auth guard utility in `server/utils/`:

```ts
// server/utils/requireAuth.ts
import type { H3Event } from 'h3'

/**
 * Require an authenticated session with an active organization.
 * Throws 401 if not authenticated, 403 if no active org.
 */
export async function requireAuth(event: H3Event) {
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!session.session.activeOrganizationId) {
    throw createError({ statusCode: 403, statusMessage: 'No active organization' })
  }

  return session
}
```

### Using the guard in handlers

```ts
export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

  // orgId is guaranteed non-null by requireAuth
  return db.query.job.findMany({
    where: eq(job.organizationId, orgId),
  })
})
```

**Rules:**
- `orgId` MUST come from `session.session.activeOrganizationId` — **NEVER** from request body, query, or URL params.
- Every domain-data API route MUST call `requireAuth()` (or equivalent).
- The Better Auth catch-all (`server/api/auth/[...all].ts`) is the ONLY route that doesn't need auth guards.

---

## 5. Input Validation with Zod v4

Applirank uses **Zod v4** (`zod@^4.3.6`). Import from `'zod'` — it's Zod 4 in this project.

### Validating request body — `readValidatedBody`

```ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

  const body = await readValidatedBody(event, z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    location: z.string().optional(),
    type: z.enum(['full_time', 'part_time', 'contract', 'internship']).default('full_time'),
  }).parse)

  const [created] = await db.insert(job).values({
    organizationId: orgId,
    title: body.title,
    description: body.description,
    location: body.location,
    type: body.type,
  }).returning()

  setResponseStatus(event, 201)
  return created
})
```

### Validating query params — `getValidatedQuery`

```ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

  const query = await getValidatedQuery(event, z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['draft', 'open', 'closed', 'archived']).optional(),
  }).parse)

  const offset = (query.page - 1) * query.limit
  const conditions = [eq(job.organizationId, orgId)]
  if (query.status) conditions.push(eq(job.status, query.status))

  const jobs = await db.query.job.findMany({
    where: and(...conditions),
    limit: query.limit,
    offset,
    orderBy: [desc(job.createdAt)],
  })

  const total = await db.$count(job, and(...conditions))

  return { data: jobs, total, page: query.page, limit: query.limit }
})
```

**Key Zod v4 note:** Query params arrive as strings. Use `z.coerce.number()` to coerce string → number for numeric query params.

### Validating route params — `getValidatedRouterParams`

```ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string().min(1),
  }).parse)

  const result = await db.query.job.findFirst({
    where: and(eq(job.id, id), eq(job.organizationId, orgId)),
    with: { applications: { with: { candidate: true } } },
  })

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  return result
})
```

### Defining reusable schemas

For schemas shared between create and update routes, define them alongside the route or in `server/utils/`:

```ts
// server/utils/schemas/job.ts
import { z } from 'zod'

export const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['full_time', 'part_time', 'contract', 'internship']).default('full_time'),
})

export const updateJobSchema = createJobSchema.partial()

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
```

### Validation method reference

| Utility | Use case | Zod integration |
|---------|----------|-----------------|
| `readValidatedBody(event, schema.parse)` | POST/PATCH/PUT body | Pass `.parse` — throws `ZodError` on invalid input (h3 converts to 400) |
| `getValidatedQuery(event, schema.parse)` | Query string params | Pass `.parse` — query values are always strings, use `z.coerce` |
| `getValidatedRouterParams(event, schema.parse)` | URL path params | Pass `.parse` — params are always strings |
| `readBody(event)` | Raw body (no validation) | Avoid in production — prefer validated version |
| `getQuery(event)` | Raw query (no validation) | Avoid in production — prefer validated version |
| `getRouterParam(event, 'name')` | Single path param (no validation) | OK for simple cases, but prefer validated version |

---

## 6. Error Handling

### Use `createError` — never return error objects

```ts
// ✅ CORRECT — throws proper HTTP error
throw createError({
  statusCode: 404,
  statusMessage: 'Job not found',
})

// ✅ With additional data for the client
throw createError({
  statusCode: 422,
  statusMessage: 'Validation failed',
  data: { field: 'email', message: 'Already exists' },
})

// ❌ WRONG — returns 200 with error body
return { error: 'Not found', code: 404 }
```

### Error properties

| Property | Purpose |
|----------|---------|
| `statusCode` | HTTP status code (400, 401, 403, 404, 422, 500) |
| `statusMessage` | Short HTTP status text — safe to expose to client |
| `message` | Internal message — **not sent to client** in production |
| `data` | Additional error data — sent to client |

### Common error patterns

```ts
// 400 — Bad request (malformed input)
throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })

// 401 — Not authenticated
throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

// 403 — Authenticated but not permitted
throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

// 404 — Resource not found (or not in this org)
throw createError({ statusCode: 404, statusMessage: 'Not found' })

// 409 — Conflict (duplicate, race condition)
throw createError({ statusCode: 409, statusMessage: 'Resource already exists' })

// 422 — Validation error (semantic issue, not malformed)
throw createError({ statusCode: 422, statusMessage: 'Unprocessable entity' })
```

### Zod validation errors

When you pass `schema.parse` to `readValidatedBody` / `getValidatedQuery`, h3 automatically wraps `ZodError` into a `400 Bad Request`. You do NOT need to catch Zod errors manually.

---

## 7. Response Patterns

### Setting status codes

```ts
// 201 Created — after inserting a resource
setResponseStatus(event, 201)
return created

// 204 No Content — after deleting
setResponseStatus(event, 204)
return null
```

### Returning typed responses

```ts
// Return objects — auto-serialized as JSON
return { data: jobs, total: 42 }

// Return arrays — auto-serialized
return jobs

// Return null — sends 204
return null
```

---

## 8. Complete CRUD Route Set Example

### List — `GET /api/jobs`

```ts
// server/api/jobs/index.get.ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

  const query = await getValidatedQuery(event, z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['draft', 'open', 'closed', 'archived']).optional(),
  }).parse)

  const offset = (query.page - 1) * query.limit
  const conditions = [eq(job.organizationId, orgId)]
  if (query.status) conditions.push(eq(job.status, query.status))

  const [data, total] = await Promise.all([
    db.query.job.findMany({
      where: and(...conditions),
      limit: query.limit,
      offset,
      orderBy: [desc(job.createdAt)],
    }),
    db.$count(job, and(...conditions)),
  ])

  return { data, total, page: query.page, limit: query.limit }
})
```

### Detail — `GET /api/jobs/:id`

```ts
// server/api/jobs/[id].get.ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string().min(1),
  }).parse)

  const result = await db.query.job.findFirst({
    where: and(eq(job.id, id), eq(job.organizationId, orgId)),
    with: { applications: { with: { candidate: true } } },
  })

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  return result
})
```

### Create — `POST /api/jobs`

```ts
// server/api/jobs/index.post.ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

  const body = await readValidatedBody(event, z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    location: z.string().optional(),
    type: z.enum(['full_time', 'part_time', 'contract', 'internship']).default('full_time'),
  }).parse)

  const [created] = await db.insert(job).values({
    organizationId: orgId,
    title: body.title,
    description: body.description,
    location: body.location,
    type: body.type,
  }).returning()

  setResponseStatus(event, 201)
  return created
})
```

### Update — `PATCH /api/jobs/:id`

```ts
// server/api/jobs/[id].patch.ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string().min(1),
  }).parse)

  const body = await readValidatedBody(event, z.object({
    title: z.string().min(1).max(200),
    description: z.string(),
    location: z.string(),
    type: z.enum(['full_time', 'part_time', 'contract', 'internship']),
    status: z.enum(['draft', 'open', 'closed', 'archived']),
  }).partial().parse)

  const [updated] = await db.update(job)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(and(eq(job.id, id), eq(job.organizationId, orgId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  return updated
})
```

### Delete — `DELETE /api/jobs/:id`

```ts
// server/api/jobs/[id].delete.ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!

  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string().min(1),
  }).parse)

  const [deleted] = await db.delete(job)
    .where(and(eq(job.id, id), eq(job.organizationId, orgId)))
    .returning({ id: job.id })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  setResponseStatus(event, 204)
  return null
})
```

---

## 9. Document Streaming & File Security

### Server-proxied document access

Documents are **never** served via presigned URLs to clients. Both download and preview endpoints stream S3 bytes through the authenticated server:

```ts
// server/api/documents/[id]/preview.get.ts — streams PDF for inline preview
import { GetObjectCommand } from '@aws-sdk/client-s3'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const orgId = session.session.activeOrganizationId!
  const documentId = getRouterParam(event, 'id')

  // Query scoped by BOTH id AND organizationId
  const doc = await db.query.document.findFirst({
    where: and(eq(document.id, documentId!), eq(document.organizationId, orgId)),
    columns: { storageKey: true, originalFilename: true, mimeType: true },
  })

  if (!doc) throw createError({ statusCode: 404, statusMessage: 'Document not found' })

  // Only PDFs for inline preview (DOC/DOCX can contain macros)
  if (doc.mimeType !== 'application/pdf') {
    throw createError({ statusCode: 415, statusMessage: 'Inline preview is only available for PDF files' })
  }

  const s3Response = await s3Client.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: doc.storageKey }),
  )

  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${encodeURIComponent(doc.originalFilename)}"`,
    'Cache-Control': 'private, max-age=300',
    'X-Frame-Options': 'SAMEORIGIN', // Override global DENY for iframe preview
    'X-Content-Type-Options': 'nosniff',
  })

  return s3Response.Body!.transformToWebStream()
})
```

### Key security rules for document endpoints

| Rule | Details |
|------|---------|
| **Always server-proxy** | Stream S3 bytes through the server — never return presigned URLs to clients |
| **Sanitize filenames** | Use `sanitizeFilename()` from `server/utils/schemas/document.ts` on all user-provided filenames |
| **Filter `storageKey`** | Never include `storageKey` in API responses — it's the internal S3 path |
| **PDF-only preview** | Only allow `application/pdf` for inline preview; DOC/DOCX can contain macros |
| **MIME validation** | Validate uploads using magic bytes (`file-type` package), not just `Content-Type` header |
| **Per-candidate limits** | Enforce `MAX_DOCUMENTS_PER_CANDIDATE` on upload endpoints |
| **X-Frame-Options override** | Preview endpoint must set `X-Frame-Options: SAMEORIGIN` to override global `DENY` |

---

## 10. Server Middleware vs Server Utils

### Use server utils for route-specific logic (PREFERRED)

```ts
// server/utils/requireAuth.ts
export async function requireAuth(event: H3Event) { /* ... */ }

// server/utils/requireRole.ts
export async function requireRole(event: H3Event, role: string) { /* ... */ }

// Usage in handler — explicit and clear
export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  // ...
})
```

### Use global server middleware ONLY for truly global concerns

```ts
// server/middleware/log.ts — runs on EVERY request
export default defineEventHandler((event) => {
  console.log(`[${new Date().toISOString()}] ${event.method} ${event.path}`)
  // DO NOT return a value — middleware must not respond
})
```

**Rules:**
- Middleware that returns a value becomes a handler (blocks the request).
- Middleware MUST NOT return anything — it's side-effect only.
- Prefer explicit util calls in handlers over invisible global middleware.

---

## 11. Server Plugins

Plugins live in `server/plugins/` and run once on server startup:

```ts
// server/plugins/migrations.ts
export default defineNitroPlugin(async () => {
  // Runs once when the server starts
  // Example: auto-apply database migrations
})
```

Use for: database migrations, connection pool setup, one-time initialization, scheduled tasks.

---

## 12. Environment Variables

All env vars are validated in `server/utils/env.ts` with Zod:

```ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  S3_ENDPOINT: z.url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
})

export const env = envSchema.parse(process.env)
```

### Adding a new env var

1. Add to `envSchema` in `server/utils/env.ts`
2. Add to `.env`
3. If for Docker services, add to `docker-compose.yml`
4. Access via `env.MY_NEW_VAR` — never `process.env.MY_NEW_VAR`

---

## 13. The Better Auth Catch-All Handler

```ts
// server/api/auth/[...all].ts
export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event))
})
```

- Routes all `/api/auth/*` requests to Better Auth.
- **DO NOT** add auth guards to this route.
- **DO NOT** modify this file unless changing the auth mount path.
- `toWebRequest(event)` converts h3's event to a standard `Request` object.

---

## 14. h3 Utility Quick Reference

### Request utilities (auto-imported)

| Utility | Returns | Use case |
|---------|---------|----------|
| `readValidatedBody(event, validator)` | Parsed & validated body | POST/PATCH/PUT body |
| `readBody(event)` | Raw parsed body | Unvalidated fallback |
| `readFormData(event)` | `FormData` | File uploads |
| `readMultipartFormData(event)` | Multipart array | File uploads |
| `getValidatedQuery(event, validator)` | Parsed & validated query | Query string params |
| `getQuery(event)` | Raw query object | Unvalidated fallback |
| `getValidatedRouterParams(event, validator)` | Parsed & validated params | URL path params |
| `getRouterParam(event, 'name')` | Single string param | Simple path param |
| `getHeader(event, 'name')` | Header value | Request headers |
| `getRequestHeaders(event)` | All headers object | Request headers |
| `getRequestURL(event)` | Full URL | URL inspection |

### Response utilities (auto-imported)

| Utility | Effect |
|---------|--------|
| `setResponseStatus(event, code)` | Set HTTP status code |
| `setResponseHeader(event, name, value)` | Set a response header |
| `setResponseHeaders(event, headers)` | Set multiple headers |
| `sendRedirect(event, url, code?)` | Send redirect response |
| `createError({ statusCode, statusMessage })` | Create H3Error (throw it) |

### Event context

```ts
// Store data on the event for downstream handlers
event.context.session = session
event.context.orgId = orgId

// Access in handler
const { session, orgId } = event.context
```

---

## 15. NEVER Do These

| Anti-pattern | Why | Do this instead |
|-------------|-----|-----------------|
| Use `process.env.X` in server code | Bypasses Zod validation, loses type safety | Import `env` from `server/utils/env.ts` |
| Get `orgId` from request body/params/query | Tenant spoofing — any user could send another org's ID | Get from `session.session.activeOrganizationId` |
| Return error objects instead of throwing | Returns 200 with error body — clients can't distinguish | `throw createError({ statusCode: 404, ... })` |
| Query DB without org scope | Cross-tenant data leak | Always include `eq(table.organizationId, orgId)` |
| Skip auth on domain-data routes | Unauthenticated access to sensitive data | Call `requireAuth(event)` in every handler |
| Use `readBody` without validation | Accepts any shape — inject, crash, corrupt | Use `readValidatedBody(event, schema.parse)` |
| Use `getQuery` without validation | Query params untyped, potential injection | Use `getValidatedQuery(event, schema.parse)` |
| Put server code inside `app/` | Wrong Nuxt 4 directory structure | `server/` lives at project root |
| Use Zod `.safeParse` in validators | h3 expects thrown errors, not result objects | Pass `.parse` (throws) to validated utils |
| Return from server middleware | Turns middleware into a handler, blocks request | Middleware should never return a value |
| Modify `server/api/auth/[...all].ts` | Breaks Better Auth routing | Leave it as-is, only change auth config in `server/utils/auth.ts` |
| Modify tables in `server/database/schema/auth.ts` | Better Auth manages these schemas | Only change auth config in `server/utils/auth.ts` |
| Import from wrong Drizzle driver | Project uses `postgres` (postgres.js) only | `import { drizzle } from 'drizzle-orm/postgres-js'` |
| Create handler without method suffix in filename | Handler receives ALL HTTP methods — ambiguous | Use `.get.ts`, `.post.ts`, `.patch.ts`, `.delete.ts` |
| Use different param names for sibling files and dirs (`[id].get.ts` + `[jobId]/`) | Nitro creates competing dynamic segments → 404 | Use the same param name: `[id].get.ts` + `[id]/` |
| Set `updatedAt` to `new Date()` in `.values()` on insert | `defaultNow()` handles insert; `.set()` needs explicit update | Only set `updatedAt: new Date()` in `.set()` (update) |
| Return presigned S3 URLs to clients | URL can be shared/leaked, bypasses auth on subsequent access | Stream file bytes through the server endpoint |
| Include `storageKey` in API responses | Exposes internal S3 paths | Select specific columns, exclude `storageKey` from `.returning()` |
| Use raw user-provided filenames | Path traversal, XSS, filesystem exploits | Use `sanitizeFilename()` from `server/utils/schemas/document.ts` |
| Allow inline preview for non-PDF files | DOC/DOCX can contain macros — security risk | Return 415 for non-PDF in preview endpoint |