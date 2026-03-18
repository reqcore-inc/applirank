ALTER TABLE "analysis_run" ALTER COLUMN "scored_by_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "auto_score_on_apply" boolean DEFAULT false NOT NULL;