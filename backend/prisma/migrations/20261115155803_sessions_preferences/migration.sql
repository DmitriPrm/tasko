-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "muted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;
