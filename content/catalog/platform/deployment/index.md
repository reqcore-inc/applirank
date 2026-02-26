---
title: One-Command Deployment
status: shipped
priority: high
complexity: M
competitors:
  greenhouse: poor
  lever: poor
  ashby: poor
  workable: poor
  opencats: okay
---

Deploy the entire stack — app, database, and file storage — with a single `docker compose up` command. No manual service configuration, no cloud dependencies.

## What it does

- `docker-compose.yml` orchestrates Nuxt app, PostgreSQL 16, MinIO, and optional Adminer
- `setup.sh` generates all required secrets and writes `.env`
- Auto-run database migrations on startup via server plugin
- Auto-create and secure MinIO bucket on startup
- Multi-stage Dockerfile with optimized production builds
- Optional `--profile tools` for Adminer (database browser)
- Ports bound to `127.0.0.1` by default for security

## Why this is unique

Commercial ATS platforms don't offer self-hosting at all. Among open-source alternatives, most require manual PostgreSQL setup, environment variable hunting, and multiple installation steps. Applirank's Docker Compose approach means you go from `git clone` to a running ATS in under 5 minutes.

## Production deployment

The reference production deployment uses:
- **Hetzner Cloud CX23** — 2 vCPU, 4GB RAM (~€5/month)
- **Caddy** — Reverse proxy with automatic HTTPS
- **Cloudflare** — DNS and DDoS protection (free tier)
- **systemd** — Process management with auto-restart
