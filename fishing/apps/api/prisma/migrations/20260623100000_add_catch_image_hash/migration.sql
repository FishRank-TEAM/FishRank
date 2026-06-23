-- AlterTable
ALTER TABLE "catches" ADD COLUMN "image_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "catches_image_hash_key" ON "catches"("image_hash") WHERE "image_hash" IS NOT NULL AND "deleted_at" IS NULL;
