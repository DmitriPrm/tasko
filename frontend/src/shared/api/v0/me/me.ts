import { createGet, createPatch } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { ZUserPreferences } from "@/shared/api/v0/schemas";

export const getPreferences = createGet({
	path: "/me/preferences",
	type: ZWrapDTO(ZUserPreferences),
});

/** Изменить часть личных настроек; ответ — настройки целиком */
export const updatePreferences = createPatch({
	path: "/me/preferences",
	type: ZWrapDTO(ZUserPreferences),
});
