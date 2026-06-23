-- CreateTable
CREATE TABLE "catch_votes" (
    "id" TEXT NOT NULL,
    "catch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catch_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catch_votes_catch_id_idx" ON "catch_votes"("catch_id");

-- CreateIndex
CREATE UNIQUE INDEX "catch_votes_catch_id_user_id_key" ON "catch_votes"("catch_id", "user_id");

-- AddForeignKey
ALTER TABLE "catch_votes" ADD CONSTRAINT "catch_votes_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "catches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catch_votes" ADD CONSTRAINT "catch_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
