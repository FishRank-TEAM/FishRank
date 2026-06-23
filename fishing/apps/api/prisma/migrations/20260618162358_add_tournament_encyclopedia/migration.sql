-- AlterTable
ALTER TABLE "fish_species" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'freshwater';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "fish_encyclopedia" (
    "id" SERIAL NOT NULL,
    "fish_species_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "habitat" TEXT,
    "season" TEXT,
    "bait" TEXT,
    "technique" TEXT,
    "avg_length_cm" INTEGER,
    "max_length_cm" INTEGER,
    "image_url" TEXT,
    "is_forbidden" BOOLEAN NOT NULL DEFAULT false,
    "min_size_law" INTEGER,

    CONSTRAINT "fish_encyclopedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fish_species_id" INTEGER,
    "is_free" BOOLEAN NOT NULL DEFAULT true,
    "entry_fee" INTEGER NOT NULL DEFAULT 0,
    "prize" TEXT,
    "prize_amount" INTEGER,
    "max_entries" INTEGER,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "banner_url" TEXT,
    "rules" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_entries" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'free',
    "payment_amount" INTEGER NOT NULL DEFAULT 0,
    "payment_tx_id" TEXT,
    "best_length_cm" DECIMAL(5,1),
    "best_catch_id" TEXT,
    "rank" INTEGER,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fish_encyclopedia_fish_species_id_key" ON "fish_encyclopedia"("fish_species_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_entries_tournament_id_user_id_key" ON "tournament_entries"("tournament_id", "user_id");

-- AddForeignKey
ALTER TABLE "fish_encyclopedia" ADD CONSTRAINT "fish_encyclopedia_fish_species_id_fkey" FOREIGN KEY ("fish_species_id") REFERENCES "fish_species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
