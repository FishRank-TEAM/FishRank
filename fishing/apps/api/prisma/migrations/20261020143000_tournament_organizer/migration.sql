ALTER TABLE "tournaments"
ADD COLUMN "organizer_id" TEXT,
ADD COLUMN "region" VARCHAR(80),
ADD COLUMN "min_length_cm" DECIMAL(5,1),
ADD COLUMN "max_length_cm" DECIMAL(5,1),
ADD COLUMN "sponsor_name" VARCHAR(80);

CREATE INDEX "tournaments_organizer_id_idx" ON "tournaments"("organizer_id");

ALTER TABLE "tournaments"
ADD CONSTRAINT "tournaments_organizer_id_fkey"
FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
