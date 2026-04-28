-- Migration: Multiple AI provider configurations per organization
-- ──────────────────────────────────────────────────────────────────────────────
-- Replaces the previous "one ai_config row per org" model with a list of
-- named configurations. Each org can mark one as the chatbot default and one
-- as the applicant-analysis default. Chatbot conversations remember which
-- configuration they were last using so a refresh keeps the selection.

-- 1. Drop the unique index that enforced "one config per org".
DROP INDEX IF EXISTS "ai_config_organization_id_idx";

-- 2. Add new columns.
ALTER TABLE "ai_config" ADD COLUMN IF NOT EXISTS "name" text NOT NULL DEFAULT 'Default';--> statement-breakpoint
ALTER TABLE "ai_config" ADD COLUMN IF NOT EXISTS "is_default_chatbot" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "ai_config" ADD COLUMN IF NOT EXISTS "is_default_analysis" boolean NOT NULL DEFAULT false;--> statement-breakpoint

-- 3. Backfill: any existing rows become the defaults for both purposes,
--    and get a friendly name derived from provider + model.
UPDATE "ai_config"
SET
  "name" = COALESCE(NULLIF("name", 'Default'), INITCAP("provider") || ' — ' || "model"),
  "is_default_chatbot" = true,
  "is_default_analysis" = true
WHERE "is_default_chatbot" = false AND "is_default_analysis" = false;--> statement-breakpoint

-- 4. Re-add a regular index on organization_id for fast lookups.
CREATE INDEX IF NOT EXISTS "ai_config_organization_id_idx" ON "ai_config" USING btree ("organization_id");--> statement-breakpoint

-- 5. Partial unique indexes enforce at most one chatbot-default and one
--    analysis-default per org, while still allowing multiple configurations.
CREATE UNIQUE INDEX IF NOT EXISTS "ai_config_default_chatbot_idx"
  ON "ai_config" ("organization_id")
  WHERE "is_default_chatbot" = true;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "ai_config_default_analysis_idx"
  ON "ai_config" ("organization_id")
  WHERE "is_default_analysis" = true;--> statement-breakpoint

-- 6. Chatbot conversations remember which AI configuration they were last
--    using. ON DELETE SET NULL so deleting a configuration doesn't break
--    historic conversations — they fall back to the org's chatbot default.
ALTER TABLE "chatbot_conversation"
  ADD COLUMN IF NOT EXISTS "ai_config_id" text
  REFERENCES "ai_config"("id") ON DELETE SET NULL;
