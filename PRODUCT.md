# WWMate â€” Product Vision & Goals

## The Developer-First ATS

WWMate is a lean, open-source Applicant Tracking System (ATS) designed for engineering teams and developer-led companies. Built by developers, for developers.

## Problem Statement

Modern ATS platforms suffer from three structural problems:

1. **Data Hostage**: Companies pay for *access* to their own candidate data. If the subscription lapses, the talent pool disappears.
2. **Opaque AI**: Incumbent platforms use proprietary algorithms to rank candidates. Recruiters cannot see *why* a candidate was surfaced or rejected â€” creating legal and ethical liability.
3. **Per-Seat Tax**: Adding a hiring manager or recruiter to the platform increases the software bill, punishing growing teams.

## Unique Value Proposition (UVP)

### 1. Ownership over Access
You *own* the infrastructure (Postgres + MinIO). Your talent pool is a permanent asset â€” not a monthly subscription. Self-host on your own servers or use a managed deployment; either way, the data is yours.

### 2. Auditable Intelligence
The source code is public â€” anyone can read exactly how the system works. Planned AI features will expose ranking logic in a visible **Matching Logic** summary so recruiters can verify and override results. No secret algorithms.

### 3. No Per-Seat Pricing
WWMate is designed to let companies scale their hiring teams without increasing their software bill.

### 4. Runs on Your Network
By supporting local-first storage (MinIO) and local AI models (Ollama), WWMate is the only ATS where sensitive candidate PII never has to leave the company's private network.

## Target Users

| Persona | Description | Primary Need |
|---------|-------------|--------------|
| **Engineering Manager / CTO** | Decides on tooling, deploys infrastructure | Simple self-hosting, Docker Compose, clear infra docs, extensibility |
| **Recruiter** | Day-to-day user managing candidates and pipeline | Fast candidate pipeline, clean UI, minimal friction |
| **Hiring Manager** | Reviews candidates, makes hiring decisions | Clear candidate comparisons, process visibility |
| **HR Administrator** | Manages org settings, team access, compliance | Multi-tenant control, data ownership, audit trails |

### Who this is for

- **Startups and scale-ups** with engineering-led cultures who deploy their own tools
- **Dev agencies and consultancies** that hire technical talent regularly
- **Engineering-led orgs** that want to own their hiring data like they own their code
- **Anyone who deploys with Docker** and doesn't want to go through procurement for an ATS

## Core Features (Current & Planned)

### MVP â€” Foundation
- [x] Multi-tenant organizations (Better Auth + org plugin)
- [x] Job management (CRUD with status workflow: draft â†’ open â†’ closed â†’ archived)
- [x] Candidate management (per-org candidate pool with deduplication by email)
- [x] Application tracking (link candidates to jobs, status workflow)
- [x] Document storage (resumes, cover letters via MinIO/S3)
- [x] Dashboard with pipeline overview
- [x] Organic SEO (sitemap, robots, JSON-LD structured data, blog content engine)

### Phase 2 â€” Intelligence
- [ ] Resume parsing (PDF â†’ structured JSON)
- [ ] AI candidate ranking with visible **Matching Logic** summary
- [ ] Skill extraction and matching
- [ ] Local AI support via Ollama (privacy-first)

### Phase 3 â€” Collaboration
- [ ] Team comments and notes on candidates
- [ ] Interview scheduling
- [ ] Email integration (send/receive from within WWMate)
- [ ] Candidate portal (self-service application status)

## Design Principles

1. **Show the Proof**: Decisions should be backed by visible data. If a skill matched, highlight it. If a candidate is ranked highly, show why.
2. **Developer-First UX**: Every screen should feel like a tool built by engineers â€” fast, keyboard-friendly, no unnecessary friction.
3. **Progressive Disclosure**: Show summaries first, details on demand. Don't overwhelm with data.
4. **Tone**: Professional, high-integrity, and engineering-grade. No marketing fluff in the UI.

## Success Metrics

- **Time to first hire**: How quickly can a new org go from setup to first candidate hired?
- **Transparency score**: % of AI decisions with visible matching logic
- **Self-hosting success rate**: % of deployments that complete without support tickets
- **Team adoption**: Number of users per org (validates anti-seat-pricing model)

