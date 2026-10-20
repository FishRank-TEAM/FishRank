ALTER TABLE "catches"
ADD COLUMN "claimed_tournament_id" TEXT,
ADD COLUMN "claimed_day_code" VARCHAR(12),
ADD COLUMN "day_code_status" VARCHAR(20);

CREATE TABLE "tournament_day_codes" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "code_date" VARCHAR(10) NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_day_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_day_codes_tournament_id_code_date_key"
ON "tournament_day_codes"("tournament_id", "code_date");

ALTER TABLE "tournament_day_codes"
ADD CONSTRAINT "tournament_day_codes_tournament_id_fkey"
FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "catches"
ADD CONSTRAINT "catches_claimed_tournament_id_fkey"
FOREIGN KEY ("claimed_tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
