CREATE TYPE "ProfileFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'CHECKBOX', 'SELECT', 'MULTI_SELECT');

CREATE TABLE "role_permissions" (
    "role" "SystemRole" NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role","code")
);

CREATE TABLE "user_permissions" (
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_id","code")
);

CREATE TABLE "profile_fields" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProfileFieldType" NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "profile_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "profile_field_values" (
    "id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "profile_field_values_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profile_fields_section_name_key" ON "profile_fields"("section", "name");
CREATE UNIQUE INDEX "profile_field_values_field_id_user_id_key" ON "profile_field_values"("field_id", "user_id");

ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_field_values" ADD CONSTRAINT "profile_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "profile_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_field_values" ADD CONSTRAINT "profile_field_values_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
