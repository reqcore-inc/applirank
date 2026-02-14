# Copilot Instructions — Applirank

* [Product Vision and Goals](../PRODUCT.md): Understand the product vision, target users, UVP, and feature roadmap.
* [System Architecture and Design Principles](../ARCHITECTURE.md): Overall system architecture, data model, technology stack, and security boundaries.
* [Roadmap and Progress](../ROADMAP.md): What's built, what's in progress, and what's planned next.
* [Changelog](../CHANGELOG.md): What changed and when, organized by date.

Suggest to update these documents if you find any incomplete or conflicting information during your work.

## Architecture Overview

Applirank is a **Nuxt 4** full-stack application using the `app/` directory structure. Key technology choices:

- **Framework**: Nuxt 4 (`app/` is `srcDir`, `server/` stays at project root)
- **Database**: PostgreSQL 16 via **Drizzle ORM** + `postgres` (postgres.js) driver
- **Auth**: **Better Auth** with `@better-auth/nuxt` module
- **Object Storage**: MinIO (S3-compatible), accessed via S3 API
- **Validation**: Zod v4
- **Infrastructure**: Docker Compose for local Postgres, MinIO, and Adminer

## Product Vision: The Sovereign Recruitment Engine

Applirank is a lean, open-source ATS designed to return power to the employer. We are the "Glass Box" alternative to the "Black Box" incumbents.

### Unique Value Proposition (UVP)
1. **Ownership over Access**: In a closed ATS, you pay for *access* to your data. In Applirank, you *own* the infrastructure (Postgres/MinIO). Your talent pool is a permanent asset, not a monthly subscription.
2. **Auditable Intelligence (The Glass Box)**: We reject "Secret Algorithms." AI in Applirank is a transparent assistant. When AI ranks a candidate, it must provide a visible "Matching Logic" summary so recruiters can verify the result.
3. **The Anti-Growth Tax**: We abolish per-seat pricing. Applirank is designed to let companies scale their hiring teams without increasing their software bill.
4. **Privacy Sovereignty**: By supporting local-first storage (MinIO) and local AI (Ollama), we offer the only ATS where sensitive candidate PII never has to leave the company's private network.

### Marketing Context for AI Generation
- **Focus**: Efficiency, Transparency, and Ownership.
- **Tone**: Professional, high-integrity, and engineering-grade.
- **UI Principle**: Show the "Proof." If the AI matches a skill, highlight it. If a candidate is "High Potential," explain why based on the data.

## Project Structure

```
app/              # Client-side source (components, pages, composables, etc.)
server/           # Nitro server code (api/, routes/, utils/, middleware/)
  utils/env.ts    # Runtime env validation — all env vars validated with Zod
public/           # Static assets
docker-compose.yml
```

## Critical Patterns

### Environment Variables

All server-side env vars are validated in `server/utils/env.ts` using a Zod schema. When adding a new env var:
1. Add it to the `envSchema` in `server/utils/env.ts`
2. Add it to `.env`
3. If it's for Docker services, also wire it in `docker-compose.yml`

Import `env` from `server/utils/env.ts` — never use `process.env` directly in server code.

### Database

- ORM: **Drizzle ORM** with the `postgres` (postgres.js) driver — not `pg` or `@neondatabase/serverless`
- Connection string comes from `env.DATABASE_URL`
- Drizzle schema files go in `server/database/schema/`
- Drizzle config at project root: `drizzle.config.ts`

### Authentication

- **Better Auth** integrated via `@better-auth/nuxt` module (registered in `nuxt.config.ts`)
- Auth config lives in `server/utils/auth.ts` (Nuxt auto-imports server utils)

### Nuxt 4 Conventions

- Use the `app/` directory for all client source code (`components/`, `pages/`, `composables/`, `layouts/`)
- `server/`, `public/`, `modules/` stay at project root — **not** inside `app/`
- The `~` alias resolves to `app/`
- Data fetching (`useAsyncData`, `useFetch`) returns `shallowRef` by default
- Use `defineNuxtRouteMiddleware` for route middleware

## Development Workflow

```bash
# Start infrastructure (Postgres, MinIO, Adminer)
docker compose up -d

# Install dependencies
npm install

# Start dev server at http://localhost:3000
npm run dev
```

Local services:
- **App**: http://localhost:3000
- **Adminer** (DB GUI): http://localhost:8080
- **MinIO Console**: http://localhost:9001 | S3 API: http://localhost:9000

## Package Manager

Use **npm** (lockfile is `package-lock.json`).

## Code Style & Conventions

### Naming
- **Database columns**: `snake_case` (`created_at`, `organization_id`)
- **JS/TS fields**: `camelCase` (`createdAt`, `organizationId`)
- **Components**: `PascalCase` filenames (`JobCard.vue`, `CandidateList.vue`)
- **Composables**: `use` prefix (`useJobs`, `useCandidates`)
- **API routes**: kebab-case paths, method suffix files (`index.get.ts`, `[id].delete.ts`)

### Error Handling
- Server: `createError({ statusCode: 4xx, statusMessage: '...' })` — never `throw new Error()`
- Client: handle `error` from `useFetch` destructuring

### Security — Multi-Tenancy (CRITICAL)
- ALL domain queries MUST filter by `organizationId`
- `organizationId` MUST come from `session.session.activeOrganizationId` — NEVER from request body, query params, or path params
- Detail endpoints: filter by BOTH `id` AND `organizationId`
- This is the #1 source of security bugs — verify it in every handler

### Documentation
- Use JSDoc `/** */` comments for exported functions and complex types
- Add section-separator comments in schema files: `// ─────────────────`

### What NOT to do
- Don't use `pg` or `@neondatabase/serverless` — use `postgres` (postgres.js)
- Don't use `process.env` — use `env` from `server/utils/env.ts`
- Don't use Options API — use `<script setup>`
- Don't use `axios` — use `useFetch` / `$fetch`
- Don't create tables without `organizationId` (auth tables exempted)
- Don't use `serial`/`integer` for primary keys — use text UUIDs
- Don't put client code outside `app/` or server code inside `app/`
- Don't use `@/` alias — use `~/` (resolves to `app/`)
- Don't use `router.push()` — use `navigateTo()`
- Don't use `<a>` tags for internal links — use `<NuxtLink>`
