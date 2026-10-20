ALTER TABLE "catches" ADD COLUMN "photo_taken_at" TIMESTAMP(3),
ADD COLUMN "exif_lat" DECIMAL(9,6),
ADD COLUMN "exif_lng" DECIMAL(9,6),
ADD COLUMN "integrity_note" VARCHAR(80);
