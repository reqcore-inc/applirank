<div align="center">

# Reqcore

**The open-source ATS you own. No per-seat fees. No data lock-in. No secret algorithms.**

[Live Demo](https://demo.reqcore.com) · [Documentation](ARCHITECTURE.md) · [Roadmap](ROADMAP.md) · [Report Bug](https://github.com/reqcore-inc/reqcore/issues/new)

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![E2E Tests](https://github.com/reqcore-inc/reqcore/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/reqcore-inc/reqcore/actions/workflows/e2e-tests.yml)
[![PR Validation](https://github.com/reqcore-inc/reqcore/actions/workflows/pr-validation.yml/badge.svg)](https://github.com/reqcore-inc/reqcore/actions/workflows/pr-validation.yml)
[![Docker Integration](https://github.com/reqcore-inc/reqcore/actions/workflows/docker-readme-validation.yml/badge.svg)](https://github.com/reqcore-inc/reqcore/actions/workflows/docker-readme-validation.yml)

</div>

---

Most recruiting software holds your candidate data hostage behind per-seat pricing and opaque algorithms. Reqcore is different — it runs on **your** infrastructure, your team scales without increasing your software bill, and when AI ranks a candidate, it shows you exactly why.

## Why Reqcore?

| | **Reqcore** | Greenhouse | Lever | Ashby | OpenCATS |
|---|:---:|:---:|:---:|:---:|:---:|
| **Open source** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Self-hosted** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **No per-seat pricing** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Own your data** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Transparent AI ranking** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Modern tech stack** | Nuxt 4 / Vue 3 | — | — | — | PHP 5 |
| **Active development** | ✅ 2026 | ✅ | ✅ | ✅ | ❌ Stale |
| **Resume parsing** | 🔜 | ✅ | ✅ | ✅ | ❌ |
| **Pipeline / Kanban** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Public job board** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Document storage** | ✅ MinIO | ✅ | ✅ | ✅ | ✅ |
| **Custom application forms** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Local AI (privacy-first)** | 🔜 Ollama | ❌ | ❌ | ❌ | ❌ |

## Features

- **Job management** — Create, edit, and track jobs through draft → open → closed → archived
- **Candidate pipeline** — Drag candidates through screening → interview → offer → hired with a Kanban board
- **Public job board** — SEO-friendly job listings with custom slugs that applicants can browse and apply to
- **Custom application forms** — Add custom questions (text, select, file upload, etc.) per job
- **Document storage** — Upload and manage resumes and cover letters via S3-compatible storage (MinIO)
- **Multi-tenant organizations** — Isolated data per organization with role-based membership
- **Recruiter dashboard** — At-a-glance stats, pipeline breakdown, recent applications, and top active jobs
- **Server-proxied documents** — Resumes are never exposed via public URLs; all access is authenticated and streamed
- **API rate limiting** — Global per-IP limits on all `/api` endpoints with stricter auth/write thresholds

## Quick Start

> **Windows users:** Open [Git Bash](https://gitforwindows.org) and run all commands there instead of Command Prompt or PowerShell.

---

### Step 1 — Install Docker

Docker packages the app, database, and file storage into containers so you don't have to install anything else manually.

| Your OS | How to install |
|---------|---------------|
| **Mac** | [Download Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) → install → open it |
| **Windows** | [Download Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) → install → open it |
| **Linux** | Follow the [Docker Engine install guide](https://docs.docker.com/engine/install/) for your distro |

Once installed, verify Docker is running:

```bash
docker --version
```

You should see something like `Docker version 27.x.x`. If you get `command not found`, Docker isn't running yet — open Docker Desktop and try again.

---

### Step 2 — Download Reqcore

Clone the repository (this downloads the source code):

```bash
git clone https://github.com/reqcore-inc/reqcore.git
cd reqcore
```

> Don't have `git`? [Download it here](https://git-scm.com/downloads), or [download a ZIP](https://github.com/reqcore-inc/reqcore/archive/refs/heads/main.zip) and unzip it manually.

---

### Step 3 — Generate your secret keys

This creates a `.env` file containing random passwords and secrets. You only run this once.

```bash
./setup.sh
```

You'll see: `✅ .env generated with random secrets.`

> **Windows CMD / PowerShell?** Run `cp .env.example .env` instead, then open `.env` and replace every placeholder value with a random string of your choice.

---

### Step 4 — Start the app

```bash
docker compose up
```

**The very first run takes 3–5 minutes** while Docker builds the app image and downloads dependencies. This is normal — you only wait this long once. Subsequent starts take seconds.

When you see a line like:

```
app  | Listening on http://[::]:3000
```

...the app is ready.

---

### Step 5 — Open Reqcore

Go to **[http://localhost:3000](http://localhost:3000)** in your browser.

Click **Sign up** to create your account and first organization. That's it — you're running your own ATS.

---

### Optional: Load demo data

Want to explore with pre-filled jobs, candidates, and a pipeline? Open a **new terminal window** while the app is running and run:

```bash
docker compose exec app npm run db:seed
```

Then sign in with:
- **Email:** `demo@reqcore.com`
- **Password:** `demo1234`

---

### Managing your instance

```bash
# Stop the app (your data is kept)
docker compose down

# Start it again
docker compose up

# Rebuild after pulling new code
docker compose up --build

# Stop and delete ALL data (irreversible)
docker compose down -v
```

---

### What's running

| Service | URL | Description |
|---------|-----|-------------|
| **App** | [localhost:3000](http://localhost:3000) | The Reqcore web UI |
| **MinIO Console** | [localhost:9001](http://localhost:9001) | File storage browser (S3-compatible) |
| **Adminer** | [localhost:8080](http://localhost:8080) | Database browser — only with `--profile tools` |

To enable Adminer (a visual database browser):

```bash
docker compose --profile tools up
# Open http://localhost:8080
# System: PostgreSQL  |  Server: db  |  Username & Password: from your .env
```

---

### Troubleshooting

| Problem | What to do |
|---------|-----------|
| `docker: command not found` | Docker isn't installed, or Docker Desktop isn't open yet |
| `permission denied: ./setup.sh` | Run `chmod +x setup.sh` first, then try again |
| App shows a connection error | The first build is still running — wait 30 seconds, then refresh |
| Port 3000 or 5432 already in use | Another app is using that port — stop it, or edit the port in `docker-compose.yml` |
| Upload / file errors | Run `docker compose logs minio` — MinIO may still be starting up |
| Need to rotate a secret | Edit `.env`, then run `docker compose up --build` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Nuxt 4](https://nuxt.com) (Vue 3 + Nitro) |
| Database | PostgreSQL 16 |
| ORM | [Drizzle ORM](https://orm.drizzle.team) + postgres.js |
| Auth | [Better Auth](https://www.better-auth.com) with organization plugin |
| Storage | [MinIO](https://min.io) (S3-compatible) |
| Validation | [Zod v4](https://zod.dev) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Icons | [Lucide](https://lucide.dev) (tree-shakeable) |

## Project Structure

```
app/                          # Frontend (Nuxt 4 srcDir)
  pages/                      #   File-based routing
  components/                 #   Auto-imported Vue components
  composables/                #   Auto-imported composables (useJobs, useCandidates, etc.)
  layouts/                    #   Dashboard, auth, and public layouts
server/                       # Backend (Nitro)
  api/                        #   REST API routes (authenticated + public)
  database/schema/            #   Drizzle ORM table definitions
  database/migrations/        #   Generated SQL migrations
  utils/                      #   Auto-imported utilities (db, auth, env, s3)
  plugins/                    #   Startup plugins (migrations, S3 bucket)
Dockerfile                    # Multi-stage build for the app container
docker-compose.yml            # App + Postgres + MinIO (+ optional Adminer)
setup.sh                      # One-time secret generator → writes .env
```

## Deployment

Reqcore is designed to run on a single VPS. The reference deployment uses:

| Component | Role |
|-----------|------|
| **Hetzner Cloud CX23** | 2 vCPU, 4GB RAM, Ubuntu 24.04 (~€5/mo) |
| **Caddy** | Reverse proxy with automatic HTTPS |
| **Cloudflare** | DNS, DDoS protection, edge SSL (free tier) |
| **Docker Compose** | Postgres + MinIO (localhost only) |
| **systemd** | Process management with auto-restart |

### Deploy

```bash
ssh deploy@your-server '~/deploy.sh'
# Pulls latest code, installs, builds, restarts — zero downtime
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full deployment architecture diagram.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:generate` | Generate migrations from schema changes |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:studio` | Open Drizzle Studio (database browser) |
| `npm run i18n:crowdin:upload` | Upload source locale file to Crowdin |
| `npm run i18n:crowdin:download` | Download latest translations from Crowdin |
| `npm run i18n:crowdin:sync` | Upload sources and then download translations |

## Internationalization

Reqcore uses Nuxt i18n (`@nuxtjs/i18n`) with Crowdin for translation management.
Implementation details and setup steps (including Crowdin native GitHub integration) are documented in [I18N.md](I18N.md).

## Roadmap

Reqcore is actively developed. Here's what's next:

| Status | Milestone |
|--------|-----------|
| ✅ Shipped | Jobs, Candidates, Applications, Pipeline, Documents, Dashboard, Public Job Board, Custom Forms |
| 🔨 Building | Resume parsing (PDF → structured data) |
| 🔮 Planned | AI candidate ranking (Glass Box — shows matching logic), team collaboration, email notifications, candidate portal |

See the full [Roadmap](ROADMAP.md) and [Product Vision](PRODUCT.md).

## Contributing

Reqcore is in early development and contributions are welcome. Check [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, DCO sign-off requirements, and submission guidelines.

## License

Licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
