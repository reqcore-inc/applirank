-- Migration: Add experience_level column to job table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TYPE "experience_level" AS ENUM('junior', 'mid', 'senior', 'lead');
--> statement-breakpoint

ALTER TABLE "job" ADD COLUMN "experience_level" "experience_level";
