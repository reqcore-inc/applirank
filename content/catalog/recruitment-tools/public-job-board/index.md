---
title: Public Job Board
status: shipped
priority: high
complexity: L
competitors:
  greenhouse: excellent
  lever: excellent
  ashby: excellent
  workable: excellent
  opencats: poor
---

A SEO-friendly public job listing page where candidates can browse open positions and apply — no authentication required.

## What it does

- Public job listing page at `/jobs` showing all open positions across all organizations
- Individual job detail pages with SEO-friendly slug-based URLs (e.g., `/jobs/senior-engineer-a1b2c3d4`)
- Custom slug support — recruiters can set their own URL slug
- Job details rendered with full markdown description support
- "Apply Now" button linking to the application form
- JSON-LD `JobPosting` structured data for Google Jobs integration
- Salary range, location, remote status, and employment type displayed when available

## Why it matters

A job board that ranks on Google means candidates find you organically — no job board fees. Applirank generates proper `JobPosting` schema markup so your listings can appear directly in Google's job search results, which is free distribution most self-hosted ATS platforms don't offer.

## Design notes

Pages are ISR-cached with a 1-hour TTL (`isr: 3600`) so they serve instantly while staying reasonably fresh. The public API intentionally exposes only the fields candidates need — no internal notes, scores, or pipeline data leak.
