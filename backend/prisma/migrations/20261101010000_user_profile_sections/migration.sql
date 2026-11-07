-- CreateTable
CREATE TABLE "profile_sections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_custom_fields" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProfileFieldType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "value" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_sections_user_id_position_idx" ON "profile_sections"("user_id", "position");

-- CreateIndex
CREATE INDEX "profile_custom_fields_section_id_position_idx" ON "profile_custom_fields"("section_id", "position");

-- AddForeignKey
ALTER TABLE "profile_sections" ADD CONSTRAINT "profile_sections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_custom_fields" ADD CONSTRAINT "profile_custom_fields_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "profile_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Перенос уже заполненных данных: у каждого пользователя появляются свои разделы и поля
INSERT INTO "profile_sections" ("id", "user_id", "title", "position")
SELECT gen_random_uuid()::text, s."user_id", s."section", (ROW_NUMBER() OVER (PARTITION BY s."user_id" ORDER BY s."section") - 1)::int
FROM (
    SELECT DISTINCT v."user_id", f."section"
    FROM "profile_field_values" v
    JOIN "profile_fields" f ON f."id" = v."field_id"
    WHERE v."value" <> ''
) s;

INSERT INTO "profile_custom_fields" ("id", "section_id", "name", "type", "options", "value", "position", "updated_at")
SELECT gen_random_uuid()::text, ps."id", f."name", f."type", f."options", v."value", f."sort_order", CURRENT_TIMESTAMP
FROM "profile_field_values" v
JOIN "profile_fields" f ON f."id" = v."field_id"
JOIN "profile_sections" ps ON ps."user_id" = v."user_id" AND ps."title" = f."section"
WHERE v."value" <> '';

-- DropTable
DROP TABLE "profile_field_values";
DROP TABLE "profile_fields";

-- Право настраивать глобальные поля больше не используется
DELETE FROM "role_permissions" WHERE "code" = 'SETTINGS_FIELDS';
DELETE FROM "user_permissions" WHERE "code" = 'SETTINGS_FIELDS';
