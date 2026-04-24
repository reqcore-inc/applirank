-- Migration: Add salary_negotiable flag to the job table
-- This supports the "Negotiable" toggle in Job Settings (Salary & Compensation).
-- When true, salary range fields are hidden/optional and the public listing
-- shows "Negotiable" instead of a specific range.
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "job" ADD COLUMN "salary_negotiable" boolean NOT NULL DEFAULT false;
