---
title: Multi-Tenant Organizations
status: shipped
priority: high
complexity: L
competitors:
  greenhouse: excellent
  lever: excellent
  ashby: excellent
  workable: good
  opencats: poor
---

Isolated data per organization with role-based membership. Every job, candidate, application, and document is scoped to an organization — no data leakage between tenants.

## What it does

- Organization creation during onboarding (post-signup)
- Organization switcher for users belonging to multiple orgs
- All API endpoints are org-scoped — queries automatically filter by the user's active organization
- Server-side `requireAuth()` utility validates both authentication and org membership
- Middleware enforces org creation before accessing the dashboard

## Why it matters

Multi-tenancy is critical for ATS platforms because recruiting agencies, HR consultancies, and companies with multiple divisions all need isolated data spaces. Without proper tenant isolation, you risk exposing one company's candidates to another — a GDPR nightmare.

## Implementation

Built on [Better Auth's](https://www.better-auth.com) organization plugin, which handles member management, role assignment, and session-scoped org context. The Drizzle ORM schema includes `organizationId` as a foreign key on every domain table, and all queries filter by it.
