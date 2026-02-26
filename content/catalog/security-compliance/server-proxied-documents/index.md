---
title: Server-Proxied Documents
status: shipped
priority: high
complexity: M
competitors:
  greenhouse: good
  lever: good
  ashby: good
  workable: okay
  opencats: poor
---

All document access (resumes, cover letters, uploads) is streamed through the Nitro server. No presigned URLs, no direct S3 access from the client.

## What it does

- Documents served via `GET /api/documents/:id/download` and `GET /api/documents/:id/preview`
- Server validates authentication and org membership before streaming
- S3 storage keys are stripped from all API responses
- PDF inline preview uses same-origin iframe with restrictive CSP headers
- Private bucket policy prevents anonymous access even if URLs leak

## Why it matters

Presigned URLs are the standard approach for serving S3 objects, but they have a fundamental flaw: anyone with the URL can access the file until it expires. For candidate resumes containing personal addresses, phone numbers, and employment history, this is unacceptable. Server-proxied access means every file request goes through authentication — no shortcuts, no leaked URLs.
