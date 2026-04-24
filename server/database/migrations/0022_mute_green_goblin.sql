ALTER TABLE "application" ADD COLUMN "viewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "viewed_by" text;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_viewed_by_user_id_fk" FOREIGN KEY ("viewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;