---
title: Resume Parsing
status: in-progress
priority: high
complexity: XL
competitors:
  greenhouse: excellent
  lever: excellent
  ashby: excellent
  workable: good
  opencats: poor
---

Automatically extract structured data from uploaded PDF resumes — contact information, work experience, education, and skills — and store it as queryable JSON.

## What it solves

Manually entering candidate data from resumes is the single biggest time sink for recruiters. A mid-size company processing 200 applications per role spends hours copy-pasting names, emails, job titles, and skills into their ATS. Resume parsing eliminates that manual step entirely.

## Planned implementation

1. **PDF text extraction** — Convert uploaded PDF resumes to plain text using a server-side extraction service
2. **Structured data extraction** — Parse the raw text into a structured JSON schema: contact info, work experience (company, title, dates), education (institution, degree, dates), and skills
3. **Storage** — Write parsed output to a `parsedContent` field on the document record
4. **Display** — Render the parsed resume as a structured card on the candidate detail page, replacing the need to open the PDF
5. **Auto-fill** — Optionally pre-fill candidate profile fields from parsed data (name, email, phone, location)

## Why not use a third-party API?

Most resume parsing services (Sovren, Affinda, etc.) require sending candidate PII to external servers. Applirank's approach keeps parsing on your own infrastructure. The planned Ollama integration (see [Local AI](/catalog/ai-intelligence/local-ai)) will enable fully private, offline resume parsing.

## Current status

This is the active development focus (Phase 2, Milestone 9). PDF text extraction is in progress.
