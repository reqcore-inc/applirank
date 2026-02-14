-- Step 1: Add slug column as nullable
ALTER TABLE "job" ADD COLUMN "slug" text;--> statement-breakpoint

-- Step 2: Backfill existing rows with a slug derived from title + short ID
UPDATE "job"
SET "slug" = CONCAT(
  LEFT(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          LOWER(TRIM("title")),
          '[^\w\s-]', '', 'g'
        ),
        '[\s_]+', '-', 'g'
      ),
      '-+', '-', 'g'
    ),
    60
  ),
  '-',
  LEFT(REPLACE("id"::text, '-', ''), 8)
);--> statement-breakpoint

-- Step 3: Make the column NOT NULL now that all rows have a value
ALTER TABLE "job" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint

-- Step 4: Add unique constraint
ALTER TABLE "job" ADD CONSTRAINT "job_slug_unique" UNIQUE("slug");