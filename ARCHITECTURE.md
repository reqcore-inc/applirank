# Applirank — System Architecture

## Overview

Applirank is a **Nuxt 4** full-stack application following a monolithic architecture with clear separation between client (`app/`) and server (`server/`) code. The system supports both **managed deployment** on Railway and **self-hosted deployment** via Docker Compose.

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
| Object Storage | S3-compatible (Railway Buckets / MinIO) | Resume/document storage |
| Validation | Zod v4 | Schema validation (server + client) |
| SEO | `@nuxtjs/seo` (Sitemap, Robots, Schema.org, SEO Utils, Site Config) | Search engine optimization, structured data |
| Content | `@nuxt/content` v3 | Markdown blog engine with typed collections |
| Infrastructure | Docker Compose (local dev) | Local Postgres, MinIO, Adminer |
| Hosting | Railway | Managed platform (auto-build, auto-deploy) |
| CDN | Cloudflare (Free) | DNS, DDoS protection, edge caching |

## Directory Structure

```
applirank/
├── app/                          # Client source (Nuxt 4 srcDir)
│   ├── app.vue                   # Root component
│   ├── assets/
│   │   └── css/main.css           # Tailwind CSS entry point + @theme tokens
│   ├── components/               # Auto-imported Vue components
│   │   └── AppSidebar.vue        # Main sidebar with dynamic job context nav
│   ├── composables/              # Auto-imported composables (useXxx)
│   ├── layouts/                  # Layout components
│   │   ├── dashboard.vue         # Sidebar + full-width main (pages set own max-w + mx-auto)
│   │   ├── auth.vue              # Centered card for sign-in/sign-up
│   │   └── public.vue            # Simple header/footer for public pages
│   ├── middleware/                # Client-side route middleware
│   ├── pages/                    # File-based routing
│   │   ├── index.vue             # Public landing page (dark theme)
│   │   ├── roadmap.vue           # Public roadmap (horizontal timeline)
│   │   ├── blog/
│   │   │   ├── index.vue         # Blog listing (dark theme)
│   │   │   └── [...slug].vue     # Blog article detail (dark theme, prose)
│   │   ├── dashboard/
│   │   │   └── jobs/
│   │   │       └── [id]/
│   │   │           ├── index.vue          # Job overview
│   │   │           ├── pipeline.vue       # Kanban board (full width)
│   │   │           ├── candidates.vue     # Data table with detail sidebar
│   │   │           └── application-form.vue # Questions + shareable link
│   ├── plugins/                  # Client-side Nuxt plugins
│   └── utils/                    # Auto-imported utilities
│       └── auth-client.ts        # Better Auth Vue client
├── server/                       # Nitro server (at project root)
│   ├── api/                      # API routes (/api/*)
│   │   ├── auth/[...all].ts      # Better Auth catch-all
│   │   ├── jobs/                 # Authenticated job CRUD + questions
│   │   │   ├── [id].get.ts       # GET /api/jobs/:id
│   │   │   └── [id]/questions/   # Custom question management
│   │   ├── documents/                # Document access endpoints
│   │   │   ├── [id].delete.ts        # DELETE /api/documents/:id
│   │   │   └── [id]/
│   │   │       ├── download.get.ts    # GET /api/documents/:id/download (server-proxied)
│   │   │       └── preview.get.ts     # GET /api/documents/:id/preview (PDF streaming)
│   │   └── public/jobs/          # Unauthenticated public job board
│   │       ├── index.get.ts      # GET /api/public/jobs (list open jobs)
│   │       ├── [slug].get.ts     # GET /api/public/jobs/:slug
│   │       └── [slug]/
│   │           └── apply.post.ts # POST /api/public/jobs/:slug/apply
│   ├── database/
│   │   ├── schema/               # Drizzle ORM table definitions
│   │   │   ├── app.ts            # Domain tables (job, candidate, etc.)
│   │   │   ├── auth.ts           # Better Auth tables (DO NOT MODIFY)
│   │   │   └── index.ts          # Re-exports all schemas
│   │   └── migrations/           # Generated SQL migrations
│   ├── middleware/                # Global server middleware
│   ├── plugins/
│   │   ├── migrations.ts         # Auto-apply migrations on startup
│   │   └── s3-bucket.ts          # Ensure S3 bucket exists + enforce private policy
│   └── utils/                    # Auto-imported server utilities
│       ├── auth.ts               # Better Auth instance
│       ├── db.ts                 # Drizzle client + connection pool
│       ├── env.ts                # Zod-validated environment variables
│       ├── requireAuth.ts        # Auth guard (throws 401/403)
│       ├── s3.ts                 # S3/MinIO client, upload, delete, bucket policy
│       ├── slugify.ts            # URL slug generation for public job pages
│       ├── rateLimit.ts          # IP-based sliding window rate limiter
│       └── schemas/              # Shared Zod validation schemas
│           ├── document.ts       # MIME types, file limits, sanitizeFilename()
│           ├── job.ts            # Job create/update schemas
│           ├── candidate.ts      # Candidate schemas
│           └── application.ts    # Application schemas
├── content/                      # Markdown content (@nuxt/content v3)
│   └── blog/                     # Blog articles (*.md with YAML frontmatter)
├── public/                       # Static assets
├── docker-compose.yml            # Postgres + MinIO + Adminer
├── drizzle.config.ts             # Drizzle Kit configuration
├── content.config.ts             # Nuxt Content collection definitions
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
                      │ HTTPS
┌─────────────────────┼───────────────────────────────┐
│  Cloudflare CDN     │                                │
│  • DNS (CNAME → Railway domain)                     │
│  • DDoS protection, edge caching                    │
│  • AI bot blocking                                  │
└─────────────────────┼───────────────────────────────┘
                      │ HTTPS
┌─────────────────────┼───────────────────────────────┐
│  Railway Project                                     │
│  ┌──────────────────▼───────────────────────────┐   │
│  │  Nuxt Service (auto-built from GitHub)        │   │
│  │  Build: npm run build                         │   │
│  │  Start: node .output/server/index.mjs         │   │
│  │  PORT: $PORT (Railway-provided)               │   │
│  └──────────┬───────────────────┬───────────────┘   │
│             │ private network   │ S3 API             │
│  ┌──────────▼──────┐   ┌───────▼────────────────┐   │
│  │  PostgreSQL     │   │  Storage Bucket        │   │
│  │  (Railway DB)   │   │  (S3-compatible)       │   │
│  │  $DATABASE_URL  │   │  $S3_ENDPOINT          │   │
│  └─────────────────┘   └────────────────────────┘   │
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

Nitro auto-imports everything from `server/utils/`. The core utilities are always available without imports:

| Utility | Purpose |
|---------|---------|
| `db` | Drizzle ORM client with schema |
| `auth` | Better Auth instance |
| `env` | Zod-validated environment variables |
| `generateJobSlug` | URL slug generation for public job pages |
| `createRateLimiter` | IP-based sliding window rate limiter |
| `uploadToS3`, `deleteFromS3` | S3/MinIO file operations |

### 3. Environment Validation

All environment variables are validated at startup via Zod in `server/utils/env.ts`. If any variable is missing or malformed, the server fails immediately with a clear error. No runtime `process.env` access is allowed outside this file.

### 4. Auto-Applied Migrations

The `server/plugins/migrations.ts` plugin runs Drizzle migrations automatically on server startup. It uses a PostgreSQL advisory lock (`pg_try_advisory_lock`) to prevent race conditions in multi-instance deployments.

### 5. SSR + Cookie Forwarding

During server-side rendering, browser cookies are not automatically forwarded to internal API calls. All authenticated `useFetch` calls must include `headers: useRequestHeaders(['cookie'])` to forward the session cookie.

### 6. File Storage & Document Security

Documents (resumes, cover letters) are stored in an S3-compatible object store (Railway Storage Buckets in production, MinIO for local development). Each document record in Postgres stores a `storageKey` (the S3 object key) while the actual file binary lives in the bucket. This separates metadata from blob storage.

Document access is **always server-proxied** — both download and preview endpoints stream file bytes through the authenticated Nitro server. Presigned S3 URLs are never exposed to clients, preventing URL sharing or leakage of sensitive candidate data.

Key security measures:
- **Private bucket policy**: Railway Buckets are private by default. For MinIO (local dev), any public bucket policy is deleted on every startup (`server/plugins/s3-bucket.ts`)
- **Filename sanitization**: All user-provided filenames are sanitized via `sanitizeFilename()` before storage, preventing path traversal, XSS, and filesystem exploits
- **MIME validation**: Upload endpoints validate file types using magic bytes (`file-type` package), not just the `Content-Type` header
- **Per-candidate document limits**: Max 20 documents per candidate, enforced on public apply endpoint
- **`storageKey` never exposed**: API responses filter out the internal S3 key
- **Preview restricted to PDF**: Only `application/pdf` files can be previewed inline; DOC/DOCX (which can contain macros) must be downloaded
- **Cache headers**: `Cache-Control: private, no-store` on both download and preview
- **X-Frame-Options**: Global `DENY` with `SAMEORIGIN` override for the preview endpoint only
- **S3 path style**: Configurable via `S3_FORCE_PATH_STYLE` env var — `true` for MinIO (path-style URLs), `false` for Railway Buckets / AWS S3 (virtual-hosted-style URLs)

## Data Model

```
organization (Better Auth)
├── job (draft → open → closed → archived)
│   └── application (new → screening → interview → offer → hired/rejected)
│       └── candidate
│           └── document (resume, cover_letter — stored in S3-compatible bucket)
└── member (user ↔ organization with role)
```

All domain tables belong to exactly one organization. Candidates are deduplicated within each org by email (`uniqueIndex(organizationId, email)`).

### 7. Nitro Route Parameter Consistency

When a dynamic segment (e.g., `[id]`) has both leaf files (`[id].get.ts`) and a subdirectory (`[id]/questions/`), both **must** use the same parameter name. Using `[id].get.ts` alongside `[jobId]/questions/` causes Nitro's router to fail with 404 errors because it creates two competing dynamic segments at the same level.

### 8. Nuxt Page Route Nesting

When a page file `pages/[id].vue` and a directory `pages/[id]/` coexist, Nuxt treats the file as a **parent layout** for nested routes in the directory. If you want sibling routes instead, place the "index" page inside the directory as `pages/[id]/index.vue`.

### 9. Public vs Authenticated Routes

Public-facing endpoints live under `server/api/public/` and require no authentication. They only expose data for resources in an `open` state (e.g., jobs). Public pages live under `app/pages/jobs/` and use the `public` layout. The landing page (`app/pages/index.vue`), roadmap page (`app/pages/roadmap.vue`), and blog pages (`app/pages/blog/`) are also public — they use the dark theme with no layout.

### 10. SEO & Structured Data

Applirank uses `@nuxtjs/seo` for comprehensive search engine optimization:

| Feature | Implementation |
|---------|---------------|
| **Sitemap** | Auto-generated + dynamic source at `server/api/__sitemap__/urls.ts` for open job listings |
| **Robots** | Blocks `/dashboard/`, `/auth/`, `/api/`, `/onboarding/` from crawlers |
| **Schema.org** | JSON-LD structured data on public pages (auto-imported composables) |
| **Meta tags** | Full OG + Twitter Card meta on all public pages via `useSeoMeta()` |
| **Route rules** | ISR for `/jobs/**` (3600s), prerender for `/`, `/roadmap`, `/blog/**` |

Structured data by page type:
- **Landing page**: `Organization` + `WebSite` + `WebPage`
- **Job detail**: `JobPosting` (title, salary, location, remote status, employment type, hiring org)
- **Blog articles**: `Article` (headline, author, datePublished, publisher)

Private pages (dashboard, auth, onboarding) include `robots: 'noindex, nofollow'` via `useSeoMeta()`.

### 11. Blog Content Engine

Blog articles are Markdown files in `content/blog/` powered by `@nuxt/content` v3:
- Collection schema defined in `content.config.ts` with typed frontmatter (title, description, date, author, image, tags)
- Queried via `queryCollection('blog')` composable (auto-imported)
- Rendered with `<ContentRenderer :value="post" />` and `@tailwindcss/typography` prose styling
- Blog pages use the same dark theme as landing/roadmap

## Security Boundaries

| Boundary | Enforcement |
|----------|-------------|
| Authentication | `requireAuth(event)` — throws 401 if no session |
| Organization membership | Better Auth org plugin — users can only access orgs they belong to |
| Tenant data isolation | Every query includes `eq(table.organizationId, orgId)` |
| Input validation | Zod v4 schemas via `readValidatedBody` / `getValidatedQuery` |
| Rate limiting | `createRateLimiter()` on public endpoints (sliding window by IP) |
| Document access | Server-proxied streaming — no presigned URLs exposed to clients |
| Document upload | MIME validation via magic bytes, filename sanitization, per-candidate limits |
| Security headers | Global Nitro route rules: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `X-XSS-Protection`, `Permissions-Policy` |
| Environment secrets | Validated at startup, never exposed to client |
## Deployment Architecture

Applirank runs on **Railway** with **Cloudflare** as CDN/DNS:

| Component | Role |
|-----------|------|
| Cloudflare (Free) | DNS, DDoS protection, SSL edge termination, AI bot blocking |
| Railway Service | Nuxt SSR app (auto-built from GitHub via Nixpacks) |
| Railway PostgreSQL | Managed Postgres database with automatic backups |
| Railway Storage Bucket | S3-compatible object storage for documents |

### Deploy Workflow

```bash
# Push to main branch — Railway auto-builds and deploys
git push origin main

# Build: npm run build (detected from package.json)
# Start: node .output/server/index.mjs
```

### Environment Variables on Railway

Variables are configured in the Railway dashboard or via `railway variables`. Service-to-service references use Railway's template syntax:

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `S3_ENDPOINT` | `${{Bucket.ENDPOINT}}` |
| `S3_ACCESS_KEY` | `${{Bucket.ACCESS_KEY_ID}}` |
| `S3_SECRET_KEY` | `${{Bucket.SECRET_ACCESS_KEY}}` |
| `S3_BUCKET` | `${{Bucket.BUCKET}}` |
| `S3_REGION` | `${{Bucket.REGION}}` |
| `S3_FORCE_PATH_STYLE` | `false` |
| `BETTER_AUTH_SECRET` | Manual (sealed) |
| `BETTER_AUTH_URL` | `https://applirank.com` |
## Local Development Services

| Service | URL | Purpose |
|---------|-----|---------|
| Nuxt App | http://localhost:3000 | Application |
| Adminer | http://localhost:8080 | Database GUI |
| MinIO Console | http://localhost:9001 | Storage GUI |
| MinIO S3 API | http://localhost:9000 | S3 endpoint |
| PostgreSQL | localhost:5432 | Database |
