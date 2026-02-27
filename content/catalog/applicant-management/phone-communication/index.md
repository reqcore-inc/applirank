---
title: Applicant Phone & SMS Communication
status: considering
priority: medium
complexity: L
competitors:
  greenhouse: good
  lever: good
  ashby: excellent
  workable: good
  opencats: poor
---

Log calls, send SMS messages, and track phone-based interactions with applicants — all from within the ATS.

## What it solves

Phone calls and text messages are a primary channel for candidate outreach, especially for time-sensitive roles. Without a log, those conversations are invisible to the rest of the hiring team. Storing call notes and SMS history alongside the application creates a complete picture of every candidate touchpoint.

## Planned scope

### Click-to-call
- Store applicant phone numbers with country code support
- Click-to-call via `tel:` links for desktop and mobile browsers
- Manual call logging: recruiter records outcome, duration, and notes after each call
- Call log displayed on the candidate timeline

### In-app calling & SMS (via Twilio)
- Optional Twilio integration for in-app calling without leaving the browser
- Automatic call duration tracking and recording (where legally permitted)
- Outbound SMS using customisable templates (interview reminders, shortlisting updates)
- Inbound SMS replies linked back to the candidate record
- Opt-out handling for SMS in compliance with local regulations

### Shared
- Unified communication timeline: calls, SMS, emails, and notes in chronological order
- Role-based access: restrict who can initiate calls or send SMS
- GDPR-aligned: candidates can request deletion of call logs and SMS records

## Design notes

Phone and SMS features will be opt-in via a Twilio integration. Teams without Twilio use click-to-call (`tel:` links) and log calls manually — no degraded experience, just fewer automations. This keeps the base product free of third-party telephony dependencies while still supporting power users who want full in-app communication.
