ALTER TABLE "catches" ADD COLUMN "perceptual_hash" VARCHAR(16);

CREATE INDEX "catches_perceptual_hash_idx" ON "catches"("perceptual_hash");
