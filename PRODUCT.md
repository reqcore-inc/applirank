# Applirank — Product Vision & Goals

## The Sovereign Recruitment Engine

Applirank is a lean, open-source Applicant Tracking System (ATS) designed to return power to the employer. We are the **"Glass Box"** alternative to the **"Black Box"** incumbents.

## Problem Statement

Modern ATS platforms suffer from three structural problems:

1. **Data Hostage**: Companies pay for *access* to their own candidate data. If the subscription lapses, the talent pool disappears.
2. **Opaque AI**: Incumbent platforms use proprietary algorithms to rank candidates. Recruiters cannot see *why* a candidate was surfaced or rejected — creating legal and ethical liability.
3. **Per-Seat Tax**: Adding a hiring manager or recruiter to the platform increases the software bill, punishing growing teams.

## Unique Value Proposition (UVP)

### 1. Ownership over Access
You *own* the infrastructure (Postgres + MinIO). Your talent pool is a permanent asset — not a monthly subscription. Self-host on your own servers or use a managed deployment; either way, the data is yours.

### 2. Auditable Intelligence (The Glass Box)
We reject "Secret Algorithms." When AI ranks a candidate, it **must** provide a visible **Matching Logic** summary so recruiters can verify the result. Every AI decision is explainable and auditable.

### 3. The Anti-Growth Tax
No per-seat pricing. Applirank is designed to let companies scale their hiring teams without increasing their software bill.

### 4. Privacy Sovereignty
By supporting local-first storage (MinIO) and local AI models (Ollama), Applirank is the only ATS where sensitive candidate PII never has to leave the company's private network.

## Target Users

| Persona | Description | Primary Need |
|---------|-------------|--------------|
| **Recruiter** | Day-to-day user managing candidates and pipeline | Fast candidate pipeline, transparent AI ranking |
| **Hiring Manager** | Reviews candidates, makes hiring decisions | Clear candidate comparisons, proof-based recommendations |
| **HR Administrator** | Manages org settings, team access, compliance | Multi-tenant control, data ownership, audit trails |
| **Engineering/IT** | Deploys and maintains the system | Simple self-hosting, Docker Compose, clear infra docs |

## Core Features (Current & Planned)

### MVP — Foundation
- [x] Multi-tenant organizations (Better Auth + org plugin)
- [x] Job management (CRUD with status workflow: draft → open → closed → archived)
- [x] Candidate management (per-org candidate pool with deduplication by email)
- [x] Application tracking (link candidates to jobs, status workflow)
- [x] Document storage (resumes, cover letters via MinIO/S3)
- [x] Dashboard with pipeline overview
- [x] Organic SEO (sitemap, robots, JSON-LD structured data, blog content engine)

### Phase 2 — Intelligence
- [ ] Resume parsing (PDF → structured JSON)
- [ ] AI candidate ranking with **Matching Logic** summary (Glass Box principle)
- [ ] Skill extraction and matching
- [ ] Local AI support via Ollama (privacy-first)

### Phase 3 — Collaboration
- [ ] Team comments and notes on candidates
- [ ] Interview scheduling
- [ ] Email integration (send/receive from within Applirank)
- [ ] Candidate portal (self-service application status)

## Design Principles

1. **Show the Proof**: If the AI matches a skill, highlight it. If a candidate is "High Potential," explain why based on the data.
2. **Recruiter-First UX**: Every screen should answer "what do I need to do next?" within 3 seconds.
3. **Progressive Disclosure**: Show summaries first, details on demand. Don't overwhelm with data.
4. **Tone**: Professional, high-integrity, and engineering-grade. No marketing fluff in the UI.

## Success Metrics

- **Time to first hire**: How quickly can a new org go from setup to first candidate hired?
- **Transparency score**: % of AI decisions with visible matching logic
- **Self-hosting success rate**: % of deployments that complete without support tickets
- **Team adoption**: Number of users per org (validates anti-seat-pricing model)
