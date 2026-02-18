ALTER TABLE "job" ADD COLUMN "salary_min" integer;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "salary_max" integer;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "salary_currency" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "salary_unit" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "remote_status" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "valid_through" timestamp;