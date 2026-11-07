import { SystemRole } from "@prisma/client";

export const PERMISSIONS = [
	{ code: "PROFILE_VIEW", group: "profile" },
	{ code: "PROFILE_EDIT_OWN", group: "profile" },
	{ code: "PROFILE_EDIT_OTHERS", group: "profile" },
	{ code: "PROFILE_EDIT_RIGHTS", group: "profile" },
	{ code: "USERS_VIEW", group: "users" },
	{ code: "USERS_CREATE", group: "users" },
	{ code: "USERS_BLOCK", group: "users" },
	{ code: "PROJECTS_VIEW", group: "projects" },
	{ code: "PROJECTS_CREATE", group: "projects" },
	{ code: "PROJECTS_EDIT", group: "projects" },
	{ code: "PROJECTS_ARCHIVE", group: "projects" },
	{ code: "PROJECTS_MANAGE_MEMBERS", group: "projects" },
	{ code: "TASKS_VIEW", group: "tasks" },
	{ code: "TASKS_CREATE", group: "tasks" },
	{ code: "TASKS_EDIT", group: "tasks" },
	{ code: "TASKS_DELETE", group: "tasks" },
	{ code: "TASKS_TRANSITION", group: "tasks" },
	{ code: "TASKS_ASSIGN", group: "tasks" },
	{ code: "COMMENTS_CREATE", group: "communication" },
	{ code: "ANALYTICS_VIEW", group: "communication" },
	{ code: "NOTIFICATIONS_VIEW", group: "communication" },
	{ code: "SETTINGS_GENERAL", group: "settings" },
	{ code: "SETTINGS_PERMISSIONS", group: "settings" },
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number]["code"];

const ALL = PERMISSIONS.map((item) => item.code);

const ADMIN_ONLY: PermissionCode[] = [
	"PROFILE_EDIT_RIGHTS",
	"USERS_VIEW",
	"USERS_CREATE",
	"USERS_BLOCK",
	"SETTINGS_PERMISSIONS",
];

const EXECUTOR: PermissionCode[] = [
	"PROFILE_VIEW",
	"PROFILE_EDIT_OWN",
	"PROJECTS_VIEW",
	"PROJECTS_CREATE",
	"PROJECTS_EDIT",
	"PROJECTS_ARCHIVE",
	"PROJECTS_MANAGE_MEMBERS",
	"TASKS_VIEW",
	"TASKS_CREATE",
	"TASKS_EDIT",
	"TASKS_DELETE",
	"TASKS_TRANSITION",
	"TASKS_ASSIGN",
	"COMMENTS_CREATE",
	"ANALYTICS_VIEW",
	"NOTIFICATIONS_VIEW",
	"SETTINGS_GENERAL",
];

export const ROLE_DEFAULTS: Record<SystemRole, PermissionCode[]> = {
	ADMIN: ALL,
	MANAGER: ALL.filter((code) => !ADMIN_ONLY.includes(code)),
	EXECUTOR,
};

export function isPermissionCode(code: string): code is PermissionCode {
	return PERMISSIONS.some((item) => item.code === code);
}
