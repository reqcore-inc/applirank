---
title: Candidate Portal
status: considering
priority: low
complexity: L
competitors:
  greenhouse: good
  lever: good
  ashby: good
  workable: okay
  opencats: poor
---

A self-service portal where candidates can check their application status, update their information, and upload additional documents.

## What it solves

Candidates currently have no way to check on their application after submitting. This generates "status check" emails that recruiters have to manually respond to. A candidate portal eliminates this overhead while improving the candidate experience.

## Planned scope

- View application status per job (which stage they're in)
- Update contact information
- Upload additional documents (updated resume, portfolio)
- No access to internal notes, scores, or pipeline data

## Design notes

The portal would use a magic link authentication flow — candidates receive an email with a secure link, no password required. This keeps the experience frictionless and avoids managing another set of credentials.
