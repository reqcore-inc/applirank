# Applirank — System Architecture

## Overview

Applirank is a **Nuxt 4** full-stack application following a monolithic architecture with clear separation between client (`app/`) and server (`server/`) code. The system is designed for **self-hosted deployment** using Docker Compose.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Nuxt 4 (Vue 3 + Nitro) | Full-stack SSR application |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Utility-first CSS framework |
| Icons | `lucide-vue-next` | Tree-shakeable icon library |
| Database | PostgreSQL 16 | Persistent data storage |
| ORM | Drizzle ORM + postgres.js | Type-safe database access |
| Authentication | Better Auth | User management, sessions, OAuth |
| Multi-Tenancy | Better Auth Organization plugin | Org-based data isolation |
| Object Storage | MinIO (S3-compatible) | Resume/document storage |
| Validation | Zod v4 | Schema validation (server + client) |
| Infrastructure | Docker Compose | Local dev + self-hosted deployment |

## Directory Structure

```
applirank/
├── app/                          # Client source (Nuxt 4 srcDir)
│   ├── app.vue                   # Root component
│   ├── assets/
│   │   └── css/main.css           # Tailwind CSS entry point + @theme tokens
│   ├── components/               # Auto-imported Vue components
│   ├── composables/              # Auto-imported composables (useXxx)
│   ├── layouts/                  # Layout components
│   ├── middleware/                # Client-side route middleware
│   ├── pages/                    # File-based routing
│   ├── plugins/                  # Client-side Nuxt plugins
│   └── utils/                    # Auto-imported utilities
│       └── auth-client.ts        # Better Auth Vue client
├── server/                       # Nitro server (at project root)
│   ├── api/                      # API routes (/api/*)
│   │   ├── auth/[...all].ts      # Better Auth catch-all
│   │   ├── jobs/                 # Authenticated job CRUD + questions
│   │   │   ├── [id].get.ts       # GET /api/jobs/:id
│   │   │   └── [id]/questions/   # Custom question management
│   │   └── public/jobs/          # Unauthenticated public job board
│   │       ├── index.get.ts      # GET /api/public/jobs (list open jobs)
│   │       └── [id].get.ts       # GET /api/public/jobs/:id
│   ├── database/
│   │   ├── schema/               # Drizzle ORM table definitions
│   │   │   ├── app.ts            # Domain tables (job, candidate, etc.)
│   │   │   ├── auth.ts           # Better Auth tables (DO NOT MODIFY)
│   │   │   └── index.ts          # Re-exports all schemas
│   │   └── migrations/           # Generated SQL migrations
│   ├── middleware/                # Global server middleware
│   ├── plugins/
│   │   └── migrations.ts         # Auto-apply migrations on startup
│   └── utils/                    # Auto-imported server utilities
│       ├── auth.ts               # Better Auth instance
│       ├── db.ts                 # Drizzle client + connection pool
│       └── env.ts                # Zod-validated environment variables
├── public/                       # Static assets
├── docker-compose.yml            # Postgres + MinIO + Adminer
├── drizzle.config.ts             # Drizzle Kit configuration
├── nuxt.config.ts                # Nuxt configuration
└── package.json                  # npm dependencies
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Browser                           │
│  ┌──────────────────────────────────────────────┐   │
│  │  Nuxt App (Vue 3 + SSR)                      │   │
│  │  • Pages / Components / Composables          │   │
│  │  • Better Auth Vue Client (authClient)       │   │
│  │  • useFetch / $fetch → /api/*                │   │
│  └──────────────────┬───────────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │ HTTP
┌─────────────────────┼───────────────────────────────┐
│  Nitro Server       │                                │
│  ┌──────────────────▼───────────────────────────┐   │
│  │  API Routes (server/api/)                     │   │
│  │  • Auth guard: requireAuth(event)             │   │
│  │  • Validation: Zod v4 schemas                 │   │
│  │  • Org scoping: session.activeOrganizationId  │   │
│  └────┬──────────────────┬──────────────────────┘   │
│       │                  │                           │
│  ┌────▼────┐    ┌───────▼────────┐                  │
│  │ Drizzle │    │  Better Auth   │                  │
│  │  ORM    │    │  (sessions,    │                  │
│  │         │    │   orgs, users) │                  │
│  └────┬────┘    └───────┬────────┘                  │
└───────┼─────────────────┼───────────────────────────┘
        │                 │
┌───────▼─────────────────▼───────────────────────────┐
│  Docker Compose Infrastructure                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Postgres │  │  MinIO   │  │ Adminer  │          │
│  │  :5432   │  │  :9000   │  │  :8080   │          │
│  │          │  │  :9001   │  │          │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Multi-Tenancy via Organization Plugin

Every domain table (`job`, `candidate`, `application`, `document`) has an `organizationId` foreign key. Tenant isolation is enforced at the **application layer** — every database query MUST include an `organizationId` filter derived from `session.session.activeOrganizationId`.

```
Request → Auth Guard → Extract orgId from session → Scope all queries by orgId
```

**The org ID NEVER comes from user input** (body, query, URL params). This is the #1 security invariant.

### 2. Auto-Imported Server Utilities

Nitro auto-imports everything from `server/utils/`. The three core utilities are always available without imports:

| Utility | Purpose |
|---------|---------|
| `db` | Drizzle ORM client with schema |
| `auth` | Better Auth instance |
| `env` | Zod-validated environment variables |

### 3. Environment Validation

All environment variables are validated at startup via Zod in `server/utils/env.ts`. If any variable is missing or malformed, the server fails immediately with a clear error. No runtime `process.env` access is allowed outside this file.

### 4. Auto-Applied Migrations

The `server/plugins/migrations.ts` plugin runs Drizzle migrations automatically on server startup. It uses a PostgreSQL advisory lock (`pg_try_advisory_lock`) to prevent race conditions in multi-instance deployments.

### 5. SSR + Cookie Forwarding

During server-side rendering, browser cookies are not automatically forwarded to internal API calls. All authenticated `useFetch` calls must include `headers: useRequestHeaders(['cookie'])` to forward the session cookie.

### 6. File Storage

Documents (resumes, cover letters) are stored in MinIO, an S3-compatible object store. Each document record in Postgres stores a `storageKey` (the S3 object key) while the actual file binary lives in MinIO. This separates metadata from blob storage.

## Data Model

```
organization (Better Auth)
├── job (draft → open → closed → archived)
│   └── application (new → screening → interview → offer → hired/rejected)
│       └── candidate
│           └── document (resume, cover_letter — stored in MinIO)
└── member (user ↔ organization with role)
```

All domain tables belong to exactly one organization. Candidates are deduplicated within each org by email (`uniqueIndex(organizationId, email)`).

### 7. Nitro Route Parameter Consistency

When a dynamic segment (e.g., `[id]`) has both leaf files (`[id].get.ts`) and a subdirectory (`[id]/questions/`), both **must** use the same parameter name. Using `[id].get.ts` alongside `[jobId]/questions/` causes Nitro's router to fail with 404 errors because it creates two competing dynamic segments at the same level.

### 8. Nuxt Page Route Nesting

When a page file `pages/[id].vue` and a directory `pages/[id]/` coexist, Nuxt treats the file as a **parent layout** for nested routes in the directory. If you want sibling routes instead, place the "index" page inside the directory as `pages/[id]/index.vue`.

### 9. Public vs Authenticated Routes

Public-facing endpoints live under `server/api/public/` and require no authentication. They only expose data for resources in an `open` state (e.g., jobs). Public pages live under `app/pages/jobs/` and use the `public` layout.

## Security Boundaries

| Boundary | Enforcement |
|----------|-------------|
| Authentication | `requireAuth(event)` — throws 401 if no session |
| Organization membership | Better Auth org plugin — users can only access orgs they belong to |
| Tenant data isolation | Every query includes `eq(table.organizationId, orgId)` |
| Input validation | Zod v4 schemas via `readValidatedBody` / `getValidatedQuery` |
| Environment secrets | Validated at startup, never exposed to client |

## Local Development Services

| Service | URL | Purpose |
|---------|-----|---------|
| Nuxt App | http://localhost:3000 | Application |
| Adminer | http://localhost:8080 | Database GUI |
| MinIO Console | http://localhost:9001 | Storage GUI |
| MinIO S3 API | http://localhost:9000 | S3 endpoint |
| PostgreSQL | localhost:5432 | Database |
