-- Migration: Chatbot persistence — agents, folders, conversations, messages.
--
-- All tables are scoped to (organization_id, user_id). Conversations and
-- folders are PRIVATE per user and never shared across an organization.
-- Custom agents (user-defined system prompts) are likewise per-user.
--
-- Hand-curated migration: drizzle-kit's auto-generated diff was discarded
-- because earlier migrations (0021–0024) were not reflected in the snapshot
-- store, which made the auto-diff include unrelated already-applied DDL.

DO $$ BEGIN
	CREATE TYPE "public"."chatbot_message_role" AS ENUM('user', 'assistant');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_agent" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"system_prompt" text NOT NULL,
	"temperature" numeric(3, 2),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_folder" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"folder_id" text,
	"agent_id" text,
	"title" text DEFAULT 'New chat' NOT NULL,
	"scope" jsonb NOT NULL,
	"thinking" boolean DEFAULT false NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"last_message_preview" text,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "chatbot_message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "chatbot_message_role" NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"reasoning" text,
	"tool_calls" jsonb,
	"sources" jsonb,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "chatbot_agent" ADD CONSTRAINT "chatbot_agent_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_agent" ADD CONSTRAINT "chatbot_agent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_folder" ADD CONSTRAINT "chatbot_folder_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_folder" ADD CONSTRAINT "chatbot_folder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_conversation" ADD CONSTRAINT "chatbot_conversation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_conversation" ADD CONSTRAINT "chatbot_conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_conversation" ADD CONSTRAINT "chatbot_conversation_folder_id_chatbot_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."chatbot_folder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_conversation" ADD CONSTRAINT "chatbot_conversation_agent_id_chatbot_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."chatbot_agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_message" ADD CONSTRAINT "chatbot_message_conversation_id_chatbot_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chatbot_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_message" ADD CONSTRAINT "chatbot_message_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_message" ADD CONSTRAINT "chatbot_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "chatbot_agent_org_user_idx" ON "chatbot_agent" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_folder_org_user_idx" ON "chatbot_folder" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_conversation_org_user_idx" ON "chatbot_conversation" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_conversation_folder_idx" ON "chatbot_conversation" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_conversation_last_message_at_idx" ON "chatbot_conversation" USING btree ("user_id","last_message_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_message_conversation_idx" ON "chatbot_message" USING btree ("conversation_id","created_at");
