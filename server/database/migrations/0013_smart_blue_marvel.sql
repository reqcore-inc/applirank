CREATE TYPE "public"."calendar_provider" AS ENUM('google');--> statement-breakpoint
CREATE TABLE "calendar_integration" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "calendar_provider" DEFAULT 'google' NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"calendar_id" text DEFAULT 'primary' NOT NULL,
	"account_email" text,
	"webhook_channel_id" text,
	"webhook_resource_id" text,
	"webhook_expiration" timestamp,
	"sync_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "google_calendar_event_id" text;--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_integration" ADD CONSTRAINT "calendar_integration_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_integration_user_provider_idx" ON "calendar_integration" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "calendar_integration_webhook_channel_idx" ON "calendar_integration" USING btree ("webhook_channel_id");