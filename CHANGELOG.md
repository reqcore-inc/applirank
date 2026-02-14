# Changelog

All notable changes to Applirank are documented here, organized by date.

Format follows [Keep a Changelog](https://keepachangelog.com). Categories: **Added**, **Changed**, **Fixed**, **Removed**.

---

## 2026-02-14

### Added

- **SEO-friendly job slugs** — public job URLs now use human-readable slugs instead of UUIDs (e.g. `/jobs/senior-software-engineer-a1b2c3d4` instead of `/jobs/a1b2c3d4-...`)
- **Custom slug support** — recruiters can optionally set a custom slug when creating or editing a job; defaults to auto-generated from job title
- **Slug utility** — `server/utils/slugify.ts` with `generateJobSlug(title, id, customSlug?)` function, auto-imported by Nitro
- **Migration** — `0002_kind_inertia.sql` adds `slug` column to `job` table with unique constraint and backfills existing rows

### Changed

- **Public API routes** — `GET /api/public/jobs/:id` and `POST /api/public/jobs/:id/apply` replaced by slug-based routes (`/api/public/jobs/:slug` and `/api/public/jobs/:slug/apply`)
- **Public pages** — `app/pages/jobs/[id]/` renamed to `app/pages/jobs/[slug]/` (detail, apply, confirmation)
- **Job list links** — public job board now links to `/jobs/<slug>` instead of `/jobs/<id>`
- **Dashboard application link** — "Copy Application Link" now generates slug-based URLs
- **Job create/update APIs** — `POST /api/jobs` generates slug on creation; `PATCH /api/jobs/:id` regenerates slug when title or slug changes
- **Zod schemas** — `createJobSchema` and `updateJobSchema` now accept optional `slug` field

### Fixed

- **Honeypot bypass** — removed `z.string().max(0)` from honeypot schema that caused Zod to reject bot submissions with 422 instead of silently discarding them; honeypot validation now handled at runtime only
- **Candidate data overwrite** — public `apply.post.ts` no longer unconditionally overwrites existing candidate `firstName`/`lastName`/`phone`; now only backfills empty fields to prevent data corruption via re-application
- **Application ID leak** — public apply response no longer exposes the internal `applicationId`
- **Reorder atomicity** — question reorder endpoint now runs inside a database transaction instead of `Promise.all` to prevent partial reorder on failure
- **Unbounded applications eager-load** — `GET /api/jobs/:id` now limits eager-loaded applications to 100 with explicit column selection instead of loading all columns for all applications

---

## 2026-02-15

### Added

- **Public job board** (`app/pages/jobs/index.vue`) — browse all open positions with search, type filter, and pagination (no auth required)
- **Public job detail page** (`app/pages/jobs/[id].vue`) — view full job description, requirements, and "Apply Now" CTA (no auth required)
- **API: `GET /api/public/jobs`** — lists open jobs with pagination, search (title/location), and type filter
- Zod validation schema `publicJobsQuerySchema` for public job listing query params
- "Open Positions" navbar link on landing page
- "View Open Positions" CTA button in landing page hero section
- "Back to job details" link on application form page
- "Browse more positions" button on application confirmation page
- Cross-linked navigation flow: Landing → Job Board → Job Detail → Apply → Confirmation → Job Board

---

## 2026-02-15

### Added

- **Public landing page** (`app/pages/index.vue`) — dark-mode marketing page with Hero, Value Props, How It Works, Tech Stack, CTA, and Footer sections
- `lucide-vue-next` icon library — high-quality, tree-shakeable icons for the entire frontend
- Dark landing page design system: `#09090b` background, `white/[0.06]` glass borders, subtle glow effects, grid pattern overlay (Linear/Resend/Raycast aesthetic)
- SEO meta tags on landing page via `useSeoMeta` (title, description, OpenGraph)
- Auth-aware navbar on landing page — shows Dashboard link for authenticated users, Sign In / Get Started for guests
- Brand SVGs for tech stack section (Nuxt, PostgreSQL)

### Changed

- `app/pages/index.vue` — replaced auth redirect with full public landing page
- Disabled Nuxt DevTools in `nuxt.config.ts` (`devtools: { enabled: false }`)

### Fixed

- White bar at bottom of landing page — added `useHead({ bodyAttrs: { style: 'background-color: #09090b;' } })` to override light body background from `main.css`
- Extra scroll space at bottom — added `overflow-hidden` to CTA section to contain decorative glow blob using `translate-y-1/2`

---

## 2026-02-14

### Added

- Tailwind CSS v4 integration via `@tailwindcss/vite` plugin
- Global CSS entry point at `app/assets/css/main.css` with `@theme` brand color tokens
- Semantic color palette: brand (indigo), accent (teal), surface (slate), success (emerald), warning (amber), danger (rose), info (sky)
- Class-based dark mode support via `@custom-variant dark`
- Base layer with antialiased rendering and dark mode body defaults
- Tailwind CSS context engineering: instruction file, skill file, copilot-instructions updates
- Nuxt 4 project scaffold with `app/` directory structure
- Docker Compose infrastructure: PostgreSQL 16, MinIO (S3), Adminer
- Drizzle ORM setup with postgres.js driver (`server/utils/db.ts`)
- Zod-validated environment variables (`server/utils/env.ts`)
- Auto-apply migrations on server startup with advisory lock (`server/plugins/migrations.ts`)
- Better Auth integration with organization plugin (`server/utils/auth.ts`)
- Auth catch-all route (`server/api/auth/[...all].ts`)
- Auth client composable (`app/utils/auth-client.ts`)
- Domain schema: `job`, `candidate`, `application`, `document` tables with relations
- Job status workflow enum: draft → open → closed → archived
- Application status workflow enum: new → screening → interview → offer → hired/rejected
- Document type enum: resume, cover_letter, other
- Per-org candidate deduplication (unique index on `organizationId` + `email`)
- `PRODUCT.md` — product vision, UVP, and target users
- `ARCHITECTURE.md` — system architecture, directory structure, and security boundaries
- `ROADMAP.md` — living roadmap with milestones and progress tracking
- `README.md` — project overview, setup instructions, and contributing guide
- Context engineering setup: copilot-instructions, architect/implement agents, plan prompt, domain instruction files
