-- Новый тип уведомления
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PROJECT_INVITATION';

-- Статусы приглашений
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED');

-- Подтверждение email: уже существующие пользователи считаются подтверждёнными
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);
UPDATE "users" SET "email_verified_at" = "created_at";

CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_invitations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "project_role" "ProjectRole" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by_id" TEXT NOT NULL,
    "invitee_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");
CREATE UNIQUE INDEX "project_invitations_token_hash_key" ON "project_invitations"("token_hash");
CREATE INDEX "project_invitations_project_id_status_idx" ON "project_invitations"("project_id", "status");
CREATE INDEX "project_invitations_email_status_idx" ON "project_invitations"("email", "status");

ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invited_by_id_fkey"
    FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invitee_id_fkey"
    FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Любой пользователь может создавать проекты и управлять своими (границы задаёт роль в проекте)
INSERT INTO "role_permissions" ("role", "code", "enabled") VALUES
    ('EXECUTOR', 'PROJECTS_CREATE', true),
    ('EXECUTOR', 'PROJECTS_EDIT', true),
    ('EXECUTOR', 'PROJECTS_ARCHIVE', true),
    ('EXECUTOR', 'PROJECTS_MANAGE_MEMBERS', true),
    ('EXECUTOR', 'TASKS_ASSIGN', true),
    ('EXECUTOR', 'TASKS_DELETE', true),
    ('EXECUTOR', 'ANALYTICS_VIEW', true)
ON CONFLICT ("role", "code") DO UPDATE SET "enabled" = true;

-- Список всех пользователей системы видит только администратор
UPDATE "role_permissions" SET "enabled" = false WHERE "role" IN ('MANAGER', 'EXECUTOR') AND "code" = 'USERS_VIEW';
DELETE FROM "user_permissions" WHERE "code" = 'USERS_VIEW' AND "user_id" IN (SELECT "id" FROM "users" WHERE "system_role" <> 'ADMIN');
