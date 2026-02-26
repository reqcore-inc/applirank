---
title: API Rate Limiting
status: shipped
priority: high
complexity: S
competitors:
  greenhouse: good
  lever: good
  ashby: good
  workable: good
  opencats: poor
---

Global per-IP rate limiting on all `/api` endpoints with stricter thresholds for authentication and write operations.

## What it does

- In-memory sliding window rate limiter (`server/utils/rateLimit.ts`)
- Applied globally via server middleware to all API routes
- Stricter limits on authentication endpoints (prevent brute force)
- Stricter limits on public application submission (prevent spam)
- Returns `429 Too Many Requests` with `Retry-After` header when exceeded
- Per-user rate limiting on feedback submission

## Why it matters

Without rate limiting, a single bad actor can spam your public application endpoint with thousands of fake applications, or brute-force login credentials. Rate limiting is the first line of defense — it doesn't replace authentication, but it prevents abuse at scale.
