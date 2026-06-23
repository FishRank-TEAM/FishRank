-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'notice',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "link_url" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_is_published_is_pinned_idx" ON "announcements"("is_published", "is_pinned");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
