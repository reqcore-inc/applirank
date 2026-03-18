CREATE TYPE "public"."analysis_run_status" AS ENUM('completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."criterion_category" AS ENUM('technical', 'experience', 'soft_skills', 'education', 'culture', 'custom');--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'scored';--> statement-breakpoint
CREATE TABLE "ai_config" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text DEFAULT 'openai' NOT NULL,
	"model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"base_url" text,
	"max_tokens" integer DEFAULT 4096 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_run" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" text NOT NULL,
	"status" "analysis_run_status" DEFAULT 'completed' NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"criteria_snapshot" jsonb,
	"composite_score" integer,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"raw_response" jsonb,
	"error_message" text,
	"scored_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "criterion_score" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" text NOT NULL,
	"criterion_key" text NOT NULL,
	"max_score" integer NOT NULL,
	"applicant_score" integer NOT NULL,
	"confidence" integer NOT NULL,
	"evidence" text NOT NULL,
	"strengths" jsonb,
	"gaps" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_criterion" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "criterion_category" DEFAULT 'custom' NOT NULL,
	"max_score" integer DEFAULT 10 NOT NULL,
	"weight" integer DEFAULT 50 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_config" ADD CONSTRAINT "ai_config_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_run" ADD CONSTRAINT "analysis_run_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_run" ADD CONSTRAINT "analysis_run_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_run" ADD CONSTRAINT "analysis_run_scored_by_id_user_id_fk" FOREIGN KEY ("scored_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criterion_score" ADD CONSTRAINT "criterion_score_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criterion_score" ADD CONSTRAINT "criterion_score_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_criterion" ADD CONSTRAINT "scoring_criterion_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_criterion" ADD CONSTRAINT "scoring_criterion_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_config_organization_id_idx" ON "ai_config" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "analysis_run_organization_id_idx" ON "analysis_run" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "analysis_run_application_id_idx" ON "analysis_run" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "analysis_run_created_at_idx" ON "analysis_run" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "criterion_score_organization_id_idx" ON "criterion_score" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "criterion_score_application_id_idx" ON "criterion_score" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "criterion_score_app_criterion_idx" ON "criterion_score" USING btree ("application_id","criterion_key");--> statement-breakpoint
CREATE INDEX "scoring_criterion_organization_id_idx" ON "scoring_criterion" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "scoring_criterion_job_id_idx" ON "scoring_criterion" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scoring_criterion_job_key_idx" ON "scoring_criterion" USING btree ("job_id","key");