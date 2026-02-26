---
title: GDPR Data Management
status: planned
priority: medium
complexity: L
competitors:
  greenhouse: good
  lever: good
  ashby: good
  workable: okay
  opencats: poor
---

Complete GDPR compliance toolkit — data export, right-to-deletion, consent tracking, and data retention policies.

## What it solves

Under GDPR, candidates have the right to request a copy of all their data and the right to be forgotten. Most ATS platforms handle this with support tickets. Applirank will automate it — one click to export, one click to delete.

## Planned implementation

- **Data export** — Generate a JSON/CSV bundle of all data associated with a candidate (profile, applications, documents, question responses)
- **Right to deletion** — Remove all candidate data across all organizations, including S3 documents
- **Consent tracking** — Record when and how consent was given for data processing
- **Data retention policies** — Auto-archive or delete candidate data after configurable time periods
- **Audit log** — Track who accessed, modified, or deleted candidate data

## Why self-hosting helps

With a self-hosted ATS, GDPR compliance is simpler because you control the entire data path. There are no sub-processors to audit, no third-party data sharing agreements to manage, and deletion means actual deletion — not a "flag as deleted" in a vendor's database.
