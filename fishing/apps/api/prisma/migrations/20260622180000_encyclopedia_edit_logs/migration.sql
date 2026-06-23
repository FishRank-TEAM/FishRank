-- CreateTable
CREATE TABLE "fish_encyclopedia_edit_logs" (
    "id" TEXT NOT NULL,
    "fish_species_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fish_encyclopedia_edit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fish_encyclopedia_edit_logs_fish_species_id_created_at_idx" ON "fish_encyclopedia_edit_logs"("fish_species_id", "created_at");

-- AddForeignKey
ALTER TABLE "fish_encyclopedia_edit_logs" ADD CONSTRAINT "fish_encyclopedia_edit_logs_fish_species_id_fkey" FOREIGN KEY ("fish_species_id") REFERENCES "fish_species"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fish_encyclopedia_edit_logs" ADD CONSTRAINT "fish_encyclopedia_edit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
