# Changelog

All notable changes to Applirank are documented here, organized by date.

Format follows [Keep a Changelog](https://keepachangelog.com). Categories: **Added**, **Changed**, **Fixed**, **Removed**.

---

## 2026-02-14

### Added

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
