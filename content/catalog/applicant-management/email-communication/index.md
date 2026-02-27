---
title: Applicant Email Communication
status: planned
priority: high
complexity: L
competitors:
  greenhouse: excellent
  lever: excellent
  ashby: excellent
  workable: good
  opencats: poor
---

Send and receive emails with applicants directly from the ATS — creating a complete, searchable email history attached to every candidate profile.

## What it solves

Without in-app email, recruiters switch between their email client and the ATS constantly. Replies get lost, threads get fragmented, and there's no audit trail of what was said to whom. Centralising email inside Reqcore means every message is automatically linked to the right applicant record.

## Planned scope

- Send and receive emails to/from applicants from the candidate or application detail page
- Bring-your-own-SMTP configuration (Gmail, Outlook, Resend, Postmark, or any SMTP provider)
- Inbound email parsing via a dedicated reply-to address so replies thread back to the correct applicant record automatically
- Pre-built email templates for common touchpoints (application received, interview invitation, rejection, offer)
- Template variables for personalisation: `{{candidate_name}}`, `{{job_title}}`, `{{company_name}}`, `{{interview_date}}`
- Full email thread view on the candidate timeline
- Bulk email for stage-level outreach (e.g., send rejection emails to all declined applicants in one click)
- Notification to recruiter when an applicant replies
- Role-based access: restrict who can initiate outreach
- GDPR-aligned: candidates can request deletion of email records

## Design notes

Email uses a bring-your-own-SMTP approach to keep infrastructure costs at zero and give self-hosters full control over deliverability. Inbound replies are parsed using a dedicated subdomain mailbox (e.g., `reply+<token>@yourdomain.com`), similar to how Basecamp and Linear handle email threading.

## Why this matters for self-hosters

Self-hosted ATS users often resist cloud tools precisely because candidate data — including private communications — leaves their infrastructure. By routing all email through the self-hosted instance, Reqcore lets teams maintain full data sovereignty without sacrificing recruiter efficiency.
