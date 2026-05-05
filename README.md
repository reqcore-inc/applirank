<div align="center">

# WWMate

**The simple, open-source ATS. Self-hosted. No per-seat fees.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![E2E Tests](https://github.com/WWMate-inc/WWMate/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/WWMate-inc/WWMate/actions/workflows/e2e-tests.yml)
[![PR Validation](https://github.com/WWMate-inc/WWMate/actions/workflows/pr-validation.yml/badge.svg)](https://github.com/WWMate-inc/WWMate/actions/workflows/pr-validation.yml)
[![Docker Integration](https://github.com/WWMate-inc/WWMate/actions/workflows/docker-readme-validation.yml/badge.svg)](https://github.com/WWMate-inc/WWMate/actions/workflows/docker-readme-validation.yml)
[![Docker Image](https://ghcr-badge.egpl.dev/WWMate-inc/WWMate/latest_tag?trim=major&label=docker)](https://github.com/WWMate-inc/WWMate/pkgs/container/WWMate)

[Live Demo](https://WWMate.com) Â· [Documentation](ARCHITECTURE.md) Â· [Roadmap](ROADMAP.md) Â· [Report Bug](https://github.com/WWMate-inc/WWMate/issues/new)


<a href="https://openalternative.co/WWMate?utm_source=openalternative&utm_medium=badge&utm_campaign=embed&utm_content=tool-WWMate" target="_blank"><img src="https://openalternative.co/WWMate/badge.svg?theme=dark&width=200&height=50" width="200" height="50" alt="WWMate badge" loading="lazy" /></a>
<a href="https://railway.com/deploy/WWMate" target="_blank"><img src="public/deploy-on-railway.svg" width="183" height="40" alt="Deploy on Railway" /></a>


</div>

---

Hiring software shouldn't be complicated or expensive. Most applicant tracking systems charge per seat, lock your data in their cloud, and overwhelm you with features you don't need. WWMate is a lightweight, open-source ATS you can self-host in minutes. No per-seat fees, no vendor lock-in, no bloat â€” just a clean tool that helps you hire.

> **Early open-source release** â€” WWMate is actively developed and improving every week. The foundation is solid (jobs, pipeline, applications, documents, job board), but some features are still on the roadmap. Check the [Roadmap](ROADMAP.md) for what's shipped and what's next.

## Why WWMate?

*Simple hiring software you actually own.*

| | **WWMate** | Greenhouse | Lever | Ashby | OpenCATS |
|---|:---:|:---:|:---:|:---:|:---:|
| **Open source** | âœ… | âŒ | âŒ | âŒ | âœ… |
| **Self-hosted** | âœ… | âŒ | âŒ | âŒ | âœ… |
| **No per-seat pricing** | âœ… | âŒ | âŒ | âŒ | âœ… |
| **Own your data** | âœ… | âŒ | âŒ | âŒ | âœ… |
| **Transparent AI ranking** | ðŸ”œ | âŒ | âŒ | âŒ | âŒ |
| **Modern tech stack** | Nuxt 4 / Vue 3 | â€” | â€” | â€” | PHP 5 |
| **Active development** | âœ… 2026 | âœ… | âœ… | âœ… | âŒ Stale |
| **Resume parsing** | ðŸ”œ | âœ… | âœ… | âœ… | âŒ |
| **Pipeline / Kanban** | âœ… | âœ… | âœ… | âœ… | âŒ |
| **Public job board** | âœ… | âœ… | âœ… | âœ… | âŒ |
| **Document storage** | âœ… MinIO | âœ… | âœ… | âœ… | âœ… |
| **Custom application forms** | âœ… | âœ… | âœ… | âœ… | âŒ |
| **Local AI (privacy-first)** | ðŸ”œ Ollama | âŒ | âŒ | âŒ | âŒ |

## Features

- **Job management** â€” Create, edit, and track jobs through draft â†’ open â†’ closed â†’ archived
- **Candidate pipeline** â€” Drag candidates through screening â†’ interview â†’ offer â†’ hired with a Kanban board
- **Public job board** â€” SEO-friendly job listings with custom slugs that applicants can browse and apply to
- **Custom application forms** â€” Add custom questions (text, select, file upload, etc.) per job
- **Document storage** â€” Upload and manage resumes and cover letters via S3-compatible storage (MinIO)
- **Multi-tenant organizations** â€” Isolated data per organization with role-based membership
- **Recruiter dashboard** â€” At-a-glance stats, pipeline breakdown, recent applications, and top active jobs
- **Secure document access** â€” Resumes are never exposed via public URLs; all access is authenticated and streamed
- **Built-in rate limiting** â€” Protection against abuse on all endpoints out of the box

## Quick Start

> **Windows users:** Open [Git Bash](https://gitforwindows.org) and run all commands there instead of Command Prompt or PowerShell.

---

### Option A â€” Use the pre-built image (fastest)

No cloning, no building. Pull the official image and run:

```bash
mkdir WWMate && cd WWMate
curl -fsSLO https://raw.githubusercontent.com/WWMate-inc/WWMate/main/docker-compose.production.yml
curl -fsSLO https://raw.githubusercontent.com/WWMate-inc/WWMate/main/setup.sh
chmod +x setup.sh
./setup.sh
docker compose -f docker-compose.production.yml up -d
```

Open **[http://localhost:3000](http://localhost:3000)** and sign up. That's it.

To update: `docker compose -f docker-compose.production.yml pull app && docker compose -f docker-compose.production.yml up -d`

---

### Option B â€” Build from source

---

### Step 1 â€” Install Docker

Docker packages the app, database, and file storage into containers so you don't have to install anything else manually.

| Your OS | How to install |
|---------|---------------|
| **Mac** | [Download Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) â†’ install â†’ open it |
| **Windows** | [Download Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) â†’ install â†’ open it |
| **Linux** | Follow the [Docker Engine install guide](https://docs.docker.com/engine/install/) for your distro |

Once installed, verify Docker is running:

```bash
docker --version
```

You should see something like `Docker version 27.x.x`. If you get `command not found`, Docker isn't running yet â€” open Docker Desktop and try again.

---

### Step 2 â€” Download WWMate

Clone the repository (this downloads the source code):

```bash
git clone https://github.com/WWMate-inc/WWMate.git
cd WWMate
```

> Don't have `git`? [Download it here](https://git-scm.com/downloads), or [download a ZIP](https://github.com/WWMate-inc/WWMate/archive/refs/heads/main.zip) and unzip it manually.

---

### Step 3 â€” Generate your secret keys

This creates a `.env` file containing random passwords and secrets. You only run this once.

```bash
./setup.sh
```

You'll see: `âœ… .env generated with random secrets.`

> **Windows CMD / PowerShell?** Run `cp .env.example .env` instead, then open `.env` and replace every placeholder value with a random string of your choice.

---

### Step 4 â€” Start the app

```bash
docker compose up
```

**The very first run takes 3â€“5 minutes** while Docker builds the app image and downloads dependencies. This is normal â€” you only wait this long once. Subsequent starts take seconds.

When you see a line like:

```
app  | Listening on http://[::]:3000
```

...the app is ready.

---

### Step 5 â€” Open WWMate

Go to **[http://localhost:3000](http://localhost:3000)** in your browser.

Click **Sign up** to create your account and first organization. That's it â€” you're running your own ATS.

---

### Optional: Load demo data

Want to explore with pre-filled jobs, candidates, and a pipeline? Open a **new terminal window** while the app is running and run:

```bash
docker compose exec app npm run db:seed
```

Then sign in with:
- **Email:** `demo@WWMate.com`
- **Password:** `demo1234`

---

### Updating to a new release

When a new version of WWMate is released, follow these steps **in order** to update your instance. Your data is safe â€” updates never delete the database or your uploaded files.

#### Pre-built image users

```bash
docker compose -f docker-compose.production.yml pull app
docker compose -f docker-compose.production.yml up -d
```

#### Build from source users

**Step 1 â€” Pull the latest code**

```bash
git pull origin main
```

**Step 2 â€” Rebuild and restart the app**

```bash
docker compose up --build -d
```

This rebuilds the app image with the new code, applies any new database migrations automatically on startup, and restarts in the background. The whole process typically takes under a minute.

**Step 3 â€” Verify it's running**

```bash
docker compose logs app --tail 20
```

Look for `Listening on http://[::]:3000`. Then open [http://localhost:3000](http://localhost:3000) â€” you're on the latest version.

> **Something wrong after an update?** Roll back by running `git checkout <previous-commit>` and then `docker compose up --build -d`.

> **To find the latest release notes**, check the [CHANGELOG](CHANGELOG.md) or [GitHub Releases](https://github.com/WWMate-inc/WWMate/releases).

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
| **App** | [localhost:3000](http://localhost:3000) | The WWMate web UI |
| **MinIO Console** | [localhost:9001](http://localhost:9001) | File storage browser (S3-compatible) |
| **Adminer** | [localhost:8080](http://localhost:8080) | Database browser â€” only with `--profile tools` |

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
| App shows a connection error | The first build is still running â€” wait 30 seconds, then refresh |
| Port 3000 or 5432 already in use | Another app is using that port â€” stop it, or edit the port in `docker-compose.yml` |
| Upload / file errors | Run `docker compose logs minio` â€” MinIO may still be starting up |
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
setup.sh                      # One-time secret generator â†’ writes .env
```

## Deployment

WWMate is designed to run on a single VPS. The reference deployment uses:

| Component | Role |
|-----------|------|
| **Hetzner Cloud CX23** | 2 vCPU, 4GB RAM, Ubuntu 24.04 (~â‚¬5/mo) |
| **Caddy** | Reverse proxy with automatic HTTPS |
| **Cloudflare** | DNS, DDoS protection, edge SSL (free tier) |
| **Docker Compose** | Postgres + MinIO (localhost only) |
| **systemd** | Process management with auto-restart |

### Deploy

```bash
ssh deploy@your-server '~/deploy.sh'
# Pulls latest code, installs, builds, restarts â€” zero downtime
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

WWMate uses Nuxt i18n (`@nuxtjs/i18n`) with Crowdin for translation management.
Implementation details and setup steps (including Crowdin native GitHub integration) are documented in [I18N.md](I18N.md).

## Roadmap

WWMate is actively developed. Here's what's next:

| Status | Milestone |
|--------|-----------|
| âœ… Shipped | Jobs, Candidates, Applications, Pipeline, Documents, Dashboard, Public Job Board, Custom Forms |
| ðŸ”¨ Building | Resume parsing (PDF â†’ structured data) |
| ðŸ”® Planned | AI candidate ranking (visible matching logic), team collaboration, email notifications, candidate portal |

See the full [Roadmap](ROADMAP.md) and [Product Vision](PRODUCT.md).

## Contributing

WWMate is in early development and contributions are welcome. Check [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, DCO sign-off requirements, and submission guidelines.

## License

Licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).

