---
title: Email Notifications
status: considering
priority: medium
complexity: L
competitors:
  greenhouse: excellent
  lever: excellent
  ashby: excellent
  workable: good
  opencats: poor
---

Automated email notifications for key hiring events — new applications, stage changes, interview reminders — plus email templates for candidate outreach.

## What it solves

Without notifications, recruiters have to actively check the dashboard for updates. Email notifications ensure nothing falls through the cracks, especially for high-volume roles where dozens of applications arrive daily.

## Planned scope

- Configurable notification triggers (new application, stage change, interview scheduled)
- Email templates for candidate communication (rejection, offer, interview confirmation)
- Template variables for personalization (candidate name, job title, company name)
- SMTP configuration (bring your own email provider)
- Opt-out per notification type

## Design notes

We'll use a bring-your-own-SMTP approach rather than building an email service. This keeps infrastructure costs at zero and gives users full control over their email deliverability.
