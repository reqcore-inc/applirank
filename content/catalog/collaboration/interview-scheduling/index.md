---
title: Interview Scheduling
status: considering
priority: medium
complexity: XL
competitors:
  greenhouse: excellent
  lever: good
  ashby: excellent
  workable: good
  opencats: poor
---

Schedule interviews with candidates, send calendar invites, and track interview outcomes — all from within the ATS.

## What it solves

Interview scheduling is one of the most tedious parts of recruiting. Coordinators spend hours going back and forth between candidates and interviewers to find available slots. An integrated scheduler reduces this to a few clicks.

## Considerationsthis is a complex feature with many edge cases (timezone handling, calendar sync, rescheduling, panel interviews). We're evaluating whether to build a lightweight version in-house or integrate with existing scheduling tools (Calendly, Cal.com) via API.

## Potential approaches

1. **Built-in scheduler** — Full calendar integration with availability management. High effort, maximum control.
2. **Cal.com integration** — Open-source scheduling tool that aligns with Applirank's self-hosted philosophy. Medium effort.
3. **Calendar link field** — Simply add a Calendly/Cal.com link to the interview stage. Low effort, minimal feature.

We're leaning toward option 2 (Cal.com integration) for the best balance of capability and development effort.
