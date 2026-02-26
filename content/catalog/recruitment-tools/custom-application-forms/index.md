---
title: Custom Application Forms
status: shipped
priority: high
complexity: L
competitors:
  greenhouse: excellent
  lever: good
  ashby: excellent
  workable: good
  opencats: poor
---

Add custom questions to any job's application form. Supports nine field types including text, select dropdowns, file upload, and more. Questions are reorderable and rendered dynamically on the public apply page.

## What it does

- Per-job custom questions with CRUD API
- Nine question types: short text, long text, email, phone, URL, number, date, select, and file upload
- Drag-to-reorder questions with bulk reorder API
- Questions rendered dynamically on the public application form via `DynamicField.vue`
- Responses stored per application and visible in the application detail and candidate sidebar
- Required/optional toggle per question
- File upload questions support resume and cover letter attachments with magic byte MIME validation

## Why it matters

Every job has different requirements. A software engineering role needs a GitHub profile link; a sales role needs territory preferences. Custom forms let recruiters tailor the application experience per job without developer involvement. The file upload type is particularly important — it lets you collect resumes, portfolios, or work samples directly through the form.

## Sub-features

### Question Types
Nine built-in types covering the most common recruitment form needs. Each type validates input appropriately (e.g., email validation, URL format checking).

### Reorderable Questions
Questions can be drag-reordered in the dashboard. The order is respected on the public form, so recruiters control the candidate's experience.

### File Upload Validation
Uploaded files go through magic byte MIME type validation (not just file extension checking) to prevent malicious file uploads. Files are stored securely in MinIO with server-proxied access.
