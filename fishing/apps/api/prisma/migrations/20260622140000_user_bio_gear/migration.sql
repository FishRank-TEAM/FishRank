-- AlterTable
ALTER TABLE "users" ADD COLUMN "bio" VARCHAR(500);

-- CreateTable
CREATE TABLE "user_gears" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500),
    "image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_gears_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_gears_user_id_idx" ON "user_gears"("user_id");

-- AddForeignKey
ALTER TABLE "user_gears" ADD CONSTRAINT "user_gears_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
