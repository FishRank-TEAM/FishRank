-- AlterTable
ALTER TABLE "fish_species" ADD COLUMN "scientific_name" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "fish_species_scientific_name_key" ON "fish_species"("scientific_name");
