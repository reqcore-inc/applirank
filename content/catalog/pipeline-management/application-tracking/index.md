---
title: Application Tracking
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

Track every application across all jobs in a single, filterable list view. Each application links a candidate to a job with a status, notes, score, and custom question responses.

## What it does

- Unified applications list across all jobs, filterable by status, job, and candidate
- Application detail page with candidate info, job context, status history, and question responses
- Notes field for recruiter annotations
- Score field for manual or AI-generated ratings
- Unique constraint: one application per candidate per job (no duplicates)
- Status workflow enforced with Zod validation

## Why it matters

Applications are the transactional core of an ATS. Every action a recruiter takes — screening, interviewing, making an offer — is recorded as an application status change. Having a unified view across all jobs means recruiters managing multiple positions can see everything in one place.
