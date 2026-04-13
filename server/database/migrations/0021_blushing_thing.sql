CREATE TABLE "applicant_account" (
	"id" text PRIMARY KEY NOT NULL,
	"google_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "applicant_account_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "applicant_portal_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"application_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_accessed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "applicant_portal_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "applicant_session" (
	"id" text PRIMARY KEY NOT NULL,
	"applicant_account_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "applicant_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "applicant_portal_token" ADD CONSTRAINT "applicant_portal_token_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_portal_token" ADD CONSTRAINT "applicant_portal_token_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_portal_token" ADD CONSTRAINT "applicant_portal_token_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_session" ADD CONSTRAINT "applicant_session_applicant_account_id_applicant_account_id_fk" FOREIGN KEY ("applicant_account_id") REFERENCES "public"."applicant_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applicant_account_email_idx" ON "applicant_account" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "applicant_account_google_id_idx" ON "applicant_account" USING btree ("google_id");--> statement-breakpoint
CREATE INDEX "portal_token_application_id_idx" ON "applicant_portal_token" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "portal_token_candidate_id_idx" ON "applicant_portal_token" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "portal_token_organization_id_idx" ON "applicant_portal_token" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "portal_token_token_idx" ON "applicant_portal_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "applicant_session_account_id_idx" ON "applicant_session" USING btree ("applicant_account_id");--> statement-breakpoint
CREATE INDEX "applicant_session_token_idx" ON "applicant_session" USING btree ("token");