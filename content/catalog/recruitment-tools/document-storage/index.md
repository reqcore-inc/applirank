---
title: Document Storage
status: shipped
priority: high
complexity: M
competitors:
  greenhouse: excellent
  lever: excellent
  ashby: excellent
  workable: good
  opencats: okay
---

Upload and manage candidate documents (resumes, cover letters, portfolios) via S3-compatible object storage. All document access is server-proxied — no presigned URLs are ever exposed to the client.

## What it does

- Upload documents to candidates via the dashboard or public application form
- Download and inline PDF preview (server-proxied streaming)
- Delete documents (removes from both MinIO and database)
- MinIO (S3-compatible) as the storage backend — runs locally in Docker
- Private bucket policy enforced on startup
- Filename sanitization for all uploads
- Per-candidate document limit (20) on public submissions
- `storageKey` filtered from all API responses (internal path never exposed)

## Why it matters

Resumes are the most sensitive data in an ATS. Unlike cloud platforms where your candidate documents live on someone else's servers, Applirank stores them in your own MinIO instance. The server-proxy pattern means the client never gets a direct URL to the storage backend — all access goes through authenticated API routes.

## Security model

Documents are stored in a private MinIO bucket. The Nitro server streams files to authenticated users via `GET /api/documents/:id/download` and `GET /api/documents/:id/preview`. The S3 storage key is stripped from all API responses, so clients never learn the internal path. This is a deliberate trade-off: slightly more server load in exchange for zero risk of URL leakage.
