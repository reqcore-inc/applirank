---
title: Kanban Pipeline Board
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

A visual drag-and-drop Kanban board for each job, showing candidates organized by hiring stage: **Applied → Screening → Interview → Offer → Hired** (with Rejected as a terminal state).

## What it does

- Per-job Kanban board at `/dashboard/jobs/:id/pipeline`
- Drag candidates between columns to advance them through stages
- Pipeline cards show candidate name, application date, and current status
- Click any card to open the candidate detail sidebar without leaving the board
- Color-coded status columns for quick visual scanning
- Status transition validation — only allowed moves are permitted

## Why it matters

The pipeline board is where recruiters spend most of their time. It needs to be fast, visual, and not require page reloads. Applirank's implementation updates the backend on drag and immediately reflects the change in the UI, so there's zero lag between action and feedback.

## How it compares

Most commercial ATS platforms have excellent Kanban boards. The gap in open-source is significant — OpenCATS has no pipeline view at all. Applirank closes this gap with a modern implementation that matches the UX quality of Greenhouse or Lever.
