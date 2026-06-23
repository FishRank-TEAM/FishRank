-- CreateTable
CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "detail" VARCHAR(500),
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_reports_target_type_target_id_status_idx" ON "content_reports"("target_type", "target_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "content_reports_target_type_target_id_reporter_id_key" ON "content_reports"("target_type", "target_id", "reporter_id");

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
