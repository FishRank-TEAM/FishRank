-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "password_hash" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'email',
    "provider_id" TEXT,
    "profile_image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fish_species" (
    "id" SERIAL NOT NULL,
    "name_ko" TEXT NOT NULL,
    "name_en" TEXT,
    "rarity_weight" DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    "min_length_cm" INTEGER,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fish_species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fish_species_id" INTEGER,
    "image_url" TEXT NOT NULL,
    "image_thumb_url" TEXT,
    "length_cm" DECIMAL(5,1),
    "ai_length_cm" DECIMAL(5,1),
    "ai_confidence" DECIMAL(4,3),
    "rank_score" DECIMAL(8,2),
    "location_lat" DECIMAL(9,6),
    "location_lng" DECIMAL(9,6),
    "location_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "catches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "catch_id" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "ruler_detected" BOOLEAN NOT NULL DEFAULT false,
    "ruler_start_px" INTEGER,
    "ruler_end_px" INTEGER,
    "ruler_length_cm" DECIMAL(5,1),
    "species_detected" TEXT,
    "species_confidence" DECIMAL(4,3),
    "rule_flat" BOOLEAN NOT NULL DEFAULT false,
    "rule_vertical" BOOLEAN NOT NULL DEFAULT false,
    "rule_ruler" BOOLEAN NOT NULL DEFAULT false,
    "rule_full_body" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rankings" (
    "id" SERIAL NOT NULL,
    "period_type" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "fish_species_id" INTEGER,
    "user_id" TEXT NOT NULL,
    "catch_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "rank_score" DECIMAL(8,2) NOT NULL,
    "length_cm" DECIMAL(5,1) NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rankings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_catch_id_key" ON "certifications"("catch_id");

-- CreateIndex
CREATE UNIQUE INDEX "rankings_period_type_period_key_fish_species_id_rank_key" ON "rankings"("period_type", "period_key", "fish_species_id", "rank");

-- AddForeignKey
ALTER TABLE "catches" ADD CONSTRAINT "catches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catches" ADD CONSTRAINT "catches_fish_species_id_fkey" FOREIGN KEY ("fish_species_id") REFERENCES "fish_species"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_fish_species_id_fkey" FOREIGN KEY ("fish_species_id") REFERENCES "fish_species"("id") ON DELETE SET NULL ON UPDATE CASCADE;
