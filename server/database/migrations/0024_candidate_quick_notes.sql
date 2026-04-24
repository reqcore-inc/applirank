-- Migration: Add quick_notes column to candidate table
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "candidate" ADD COLUMN "quick_notes" text;
