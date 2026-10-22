ALTER TABLE "tournaments"
ADD COLUMN "spot_lat" DECIMAL(9,6),
ADD COLUMN "spot_lng" DECIMAL(9,6),
ADD COLUMN "spot_radius_km" DECIMAL(4,1);
