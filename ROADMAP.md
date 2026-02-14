# Applirank — Roadmap

> Last updated: 2026-02-14
>
> This is the single source of truth for what's built, what's in progress, and what's planned.
> For product vision see [PRODUCT.md](PRODUCT.md). For architecture see [ARCHITECTURE.md](ARCHITECTURE.md).
>
> **Convention**: Update this file when you start or finish work. AI agents reference it for context.

## 🎯 Current Focus

**Phase 1, Milestone 2: Auth UI & Navigation** — Build the first usable screens so users can sign up, sign in, and see an app shell.

---

## Phase 1: MVP — A Working ATS

Goal: A recruiter can sign up, create jobs, add candidates, track applications, and upload resumes.

### Milestone 1: Foundation ✅

Infrastructure, auth, database schema — the base everything else builds on.

- [x] Nuxt 4 project scaffold with `app/` directory structure
- [x] PostgreSQL + MinIO + Adminer via Docker Compose
- [x] Drizzle ORM with postgres.js driver (`server/utils/db.ts`)
- [x] Zod-validated env vars (`server/utils/env.ts`)
- [x] Auto-apply migrations on startup (`server/plugins/migrations.ts`)
- [x] Better Auth with org plugin (`server/utils/auth.ts`)
- [x] Auth catch-all route (`server/api/auth/[...all].ts`)
- [x] Auth client (`app/utils/auth-client.ts`)
- [x] Domain schema: job, candidate, application, document tables
- [x] Relations between all domain tables
- [x] Context engineering setup (copilot-instructions, agents, prompts, domain instructions)

### Milestone 2: Auth UI & Navigation (not started)

Users can sign up, sign in, create/switch orgs, and see an app shell.

- [ ] Sign-up page (`app/pages/auth/sign-up.vue`)
- [ ] Sign-in page (`app/pages/auth/sign-in.vue`)
- [ ] Auth middleware — redirect unauthenticated users (`app/middleware/auth.ts`)
- [ ] Organization creation flow (post-signup)
- [ ] Organization switcher component
- [ ] App layout with sidebar navigation (`app/layouts/dashboard.vue`)
- [ ] Root page redirects to dashboard (`app/pages/index.vue`)

### Milestone 3: Job Management (not started)

Full CRUD for jobs with status workflow.

- [ ] API: `GET /api/jobs` — list jobs (org-scoped)
- [ ] API: `POST /api/jobs` — create job
- [ ] API: `GET /api/jobs/:id` — job detail
- [ ] API: `PATCH /api/jobs/:id` — update job
- [ ] API: `DELETE /api/jobs/:id` — delete/archive job
- [ ] Composable: `useJobs()` — list + mutations
- [ ] Composable: `useJob(id)` — single job + mutations
- [ ] Page: Jobs list (`app/pages/jobs/index.vue`)
- [ ] Page: Job detail/edit (`app/pages/jobs/[id].vue`)
- [ ] Page: Job creation form (`app/pages/jobs/new.vue`)
- [ ] Job status transitions UI (draft → open → closed → archived)

### Milestone 4: Candidate Management (not started)

Full CRUD for candidates with deduplication.

- [ ] API: `GET /api/candidates` — list candidates (org-scoped)
- [ ] API: `POST /api/candidates` — create candidate (dedupe by email)
- [ ] API: `GET /api/candidates/:id` — candidate detail
- [ ] API: `PATCH /api/candidates/:id` — update candidate
- [ ] API: `DELETE /api/candidates/:id` — delete candidate
- [ ] Composable: `useCandidates()` and `useCandidate(id)`
- [ ] Page: Candidates list
- [ ] Page: Candidate detail (with applications & documents tabs)
- [ ] Page: Candidate creation form

### Milestone 5: Applications & Pipeline (not started)

Link candidates to jobs, track through hiring stages.

- [ ] API: `GET /api/applications` — list (filterable by job, status)
- [ ] API: `POST /api/applications` — create (link candidate → job)
- [ ] API: `PATCH /api/applications/:id` — update status
- [ ] Composable: `useApplications(filters)`
- [ ] Pipeline/Kanban view per job (columns: new → screening → interview → offer → hired/rejected)
- [ ] Status transition validation (define allowed transitions)
- [ ] "Apply candidate to job" flow from both job and candidate detail pages

### Milestone 6: Document Storage (not started)

Upload and manage resumes/cover letters via MinIO.

- [ ] MinIO S3 client utility (`server/utils/s3.ts`)
- [ ] API: `POST /api/documents` — upload (multipart/form-data → MinIO)
- [ ] API: `GET /api/documents/:id/download` — download (presigned URL)
- [ ] API: `DELETE /api/documents/:id` — delete (MinIO + DB)
- [ ] Resume upload component on candidate detail page
- [ ] Document list on candidate detail page

### Milestone 7: Dashboard (not started)

At-a-glance overview for recruiters.

- [ ] Dashboard API: aggregated stats (open jobs, recent apps, pipeline breakdown)
- [ ] Dashboard page with widgets (counts, recent activity, quick actions)
- [ ] "Create job" and "Add candidate" quick actions

---

## Phase 2: Intelligence

Goal: AI helps recruiters find the best candidates — transparently.

### Milestone 8: Resume Parsing

- [ ] PDF text extraction service
- [ ] Structured data extraction (contact, experience, education, skills → JSON)
- [ ] Store parsed output in `document.parsedContent`
- [ ] Display parsed resume on candidate detail page
- [ ] Auto-fill candidate fields from parsed resume

### Milestone 9: AI Candidate Ranking (Glass Box)

- [ ] Ranking criteria schema (configurable per job)
- [ ] AI matching engine (job requirements ↔ candidate skills)
- [ ] Matching Logic summary — visible explanation per candidate
- [ ] Highlighted skill matches on candidate cards
- [ ] Sort/filter by AI score
- [ ] Local AI via Ollama as alternative to cloud

---

## Phase 3: Collaboration

Goal: Teams can work together on hiring decisions.

### Milestone 10: Team Collaboration

- [ ] Comments/notes on applications (threaded)
- [ ] Activity log per candidate/job
- [ ] Role-based permissions (recruiter, hiring manager, admin)

### Milestone 11: Communication

- [ ] Interview scheduling
- [ ] Email templates for candidate outreach
- [ ] Candidate portal (view application status)

---

## Phase 4: Production Readiness

Goal: Ready for real teams to self-host in production.

### Milestone 12: Hardening

- [ ] Production Docker Compose / deployment guide
- [ ] HTTPS/TLS configuration
- [ ] Backup & restore (Postgres + MinIO)
- [ ] Rate limiting
- [ ] GDPR data export & deletion
- [ ] Test suite (API + E2E)
- [ ] CI/CD pipeline
- [ ] README rewrite with screenshots

---

## Completed Milestones

| Milestone | Completed |
|-----------|-----------|
| 1. Foundation | 2026-02-14 |

---

## How to Use This File

**As a developer**: Check "Current Focus" to know what to build next. Check off tasks as you finish them. Add new tasks when you discover work.

**As AI**: Read this file to understand what's implemented and what isn't. Don't rebuild completed work. Follow the dependency order (milestones are ordered by dependency).

**As a contributor**: Pick any unchecked task from the current focus milestone. Open an issue or PR referencing the task.
