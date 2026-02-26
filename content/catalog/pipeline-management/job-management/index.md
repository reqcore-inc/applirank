---
title: Job Management
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

Full CRUD for jobs with a structured status workflow: **Draft → Open → Closed → Archived**. Each status transition is enforced — you can't accidentally publish a draft or reopen an archived position.

## What it does

- Create, edit, and delete job postings with title, description, location, employment type, and salary range
- Status workflow with validated transitions (e.g., draft → open, but not draft → archived directly)
- Custom URL slugs for public job pages, auto-generated from the title with a short UUID suffix
- Organization-scoped — each org sees only its own jobs
- Real-time job counts on the dashboard

## Why it matters

Job management is table stakes for an ATS, but most open-source alternatives get it wrong by either making it too simple (no status workflow) or too complex (enterprise-grade approval chains nobody uses). Applirank lands in the middle — structured enough to prevent mistakes, simple enough to not slow you down.

## Design notes

The job detail page uses a tabbed layout with sub-pages for Overview, Pipeline, Candidates, and Application Form. This keeps context tight — you never leave the job to manage its pipeline or questions.
