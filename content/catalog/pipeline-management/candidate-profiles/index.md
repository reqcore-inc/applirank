---
title: Candidate Profiles
status: shipped
priority: high
complexity: M
competitors:
  greenhouse: excellent
  lever: good
  ashby: excellent
  workable: good
  opencats: poor
---

Every candidate gets a dedicated profile page with their contact information, application history across all jobs, uploaded documents, and any custom question responses they've submitted.

## What it does

- Org-scoped candidate pool with automatic deduplication by email address
- Candidate detail page with tabbed sections: info, applications, documents
- Link candidates to multiple jobs simultaneously
- Full search and filtering across the candidate pool
- Inline PDF resume preview directly on the candidate page

## Why it matters

A candidate should exist once in your system regardless of how many jobs they apply to. Email-based deduplication ensures you never create duplicate records, and the unified profile gives recruiters a complete picture of every interaction with a candidate across all positions.

## Design notes

The candidate detail sidebar (`CandidateDetailSidebar.vue`) slides over the pipeline view, letting recruiters review candidate details without navigating away from the Kanban board. This pattern is inspired by Supabase's data table rows.
