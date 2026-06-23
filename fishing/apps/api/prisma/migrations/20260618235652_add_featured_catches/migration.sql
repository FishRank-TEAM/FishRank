-- AlterTable
ALTER TABLE "users" ADD COLUMN     "featured_catch_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
