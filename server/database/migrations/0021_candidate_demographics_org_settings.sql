-- Migration: Add candidate demographics (gender, date_of_birth, display_name) and org_settings table
-- ──────────────────────────────────────────────────────────────────────────────────────────────────

-- New enums
CREATE TYPE "gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');
--> statement-breakpoint
CREATE TYPE "name_display_format" AS ENUM('first_last', 'last_first');
--> statement-breakpoint
CREATE TYPE "date_format" AS ENUM('mdy', 'dmy', 'ymd');
--> statement-breakpoint

-- New columns on candidate table
ALTER TABLE "candidate" ADD COLUMN "display_name" text;
--> statement-breakpoint
ALTER TABLE "candidate" ADD COLUMN "gender" "gender";
--> statement-breakpoint
ALTER TABLE "candidate" ADD COLUMN "date_of_birth" text;
--> statement-breakpoint

-- Index on gender for filtering
CREATE INDEX "candidate_gender_idx" ON "candidate" USING btree ("organization_id", "gender");
--> statement-breakpoint

-- org_settings table
CREATE TABLE "org_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name_display_format" "name_display_format" NOT NULL DEFAULT 'first_last',
	"date_format" "date_format" NOT NULL DEFAULT 'mdy',
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE "org_settings" ADD CONSTRAINT "org_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "org_settings_organization_id_idx" ON "org_settings" USING btree ("organization_id");
