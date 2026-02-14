CREATE TYPE "public"."question_type" AS ENUM('short_text', 'long_text', 'single_select', 'multi_select', 'number', 'date', 'url', 'checkbox');--> statement-breakpoint
CREATE TABLE "job_question" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"type" "question_type" DEFAULT 'short_text' NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_response" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" text NOT NULL,
	"question_id" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_question" ADD CONSTRAINT "job_question_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_question" ADD CONSTRAINT "job_question_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_response" ADD CONSTRAINT "question_response_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_response" ADD CONSTRAINT "question_response_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_response" ADD CONSTRAINT "question_response_question_id_job_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."job_question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_question_organization_id_idx" ON "job_question" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "job_question_job_id_idx" ON "job_question" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "question_response_organization_id_idx" ON "question_response" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "question_response_application_id_idx" ON "question_response" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "question_response_question_id_idx" ON "question_response" USING btree ("question_id");