-- CreateTable
CREATE TABLE "capture_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capture_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "capture_sessions_token_hash_key" ON "capture_sessions"("token_hash");
CREATE INDEX "capture_sessions_user_id_expires_at_idx" ON "capture_sessions"("user_id", "expires_at");

ALTER TABLE "capture_sessions" ADD CONSTRAINT "capture_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
