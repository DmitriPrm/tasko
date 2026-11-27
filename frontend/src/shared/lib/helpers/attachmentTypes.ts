/**
 * Типы вложений, которые понимает сервер (backend/src/system-settings/system-settings.ts),
 * сгруппированные для настроек: администратор включает группы, а не отдельные MIME-типы.
 */
export const ATTACHMENT_GROUPS: { id: string; types: string[]; extensions: string[] }[] = [
	{
		id: "images",
		types: ["image/png", "image/jpeg", "image/gif", "image/webp"],
		extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
	},
	{ id: "pdf", types: ["application/pdf"], extensions: [".pdf"] },
	{ id: "text", types: ["text/plain", "text/csv"], extensions: [".txt", ".csv"] },
	{
		id: "documents",
		types: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
		extensions: [".doc", ".docx"],
	},
	{
		id: "spreadsheets",
		types: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
		extensions: [".xls", ".xlsx"],
	},
	{
		id: "presentations",
		types: [
			"application/vnd.ms-powerpoint",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		],
		extensions: [".ppt", ".pptx"],
	},
	{ id: "archives", types: ["application/zip", "application/x-zip-compressed"], extensions: [".zip"] },
];

/** Значение для <input accept>: расширения разрешённых групп */
export function acceptFor(allowedTypes: string[]) {
	return ATTACHMENT_GROUPS.filter((group) => group.types.some((type) => allowedTypes.includes(type)))
		.flatMap((group) => group.extensions)
		.join(",");
}

/** Какие группы сейчас разрешены */
export function enabledGroups(allowedTypes: string[]) {
	return ATTACHMENT_GROUPS.filter((group) => group.types.some((type) => allowedTypes.includes(type))).map(
		(group) => group.id,
	);
}

export function typesForGroups(groupIds: string[]) {
	return ATTACHMENT_GROUPS.filter((group) => groupIds.includes(group.id)).flatMap((group) => group.types);
}
