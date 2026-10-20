ALTER TABLE "tournament_entries"
ADD COLUMN "disqualified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "disqualify_note" VARCHAR(200);
