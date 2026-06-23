-- CreateTable
CREATE TABLE "fish_encyclopedia_tips" (
    "id" TEXT NOT NULL,
    "fish_species_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "season" TEXT,
    "bait" TEXT,
    "technique" TEXT,
    "habitat" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fish_encyclopedia_tips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fish_encyclopedia_tips_fish_species_id_idx" ON "fish_encyclopedia_tips"("fish_species_id");

-- AddForeignKey
ALTER TABLE "fish_encyclopedia_tips" ADD CONSTRAINT "fish_encyclopedia_tips_fish_species_id_fkey" FOREIGN KEY ("fish_species_id") REFERENCES "fish_species"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fish_encyclopedia_tips" ADD CONSTRAINT "fish_encyclopedia_tips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
