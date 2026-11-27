import { translate } from "@/shared/lib/theming/i18n/translate";

export function statusLabel(status: string) {
	return translate(`taskStatus.${status}`);
}

export function priorityLabel(priority: string) {
	return translate(`taskPriority.${priority}`);
}

export function typeLabel(type: string) {
	return translate(`taskType.${type}`);
}

export function projectStatusLabel(status: string) {
	return translate(`projectStatus.${status}`);
}

export function roleLabel(role: string) {
	return translate(`roles.${role}`);
}

export const statusTagType: Record<string, "info" | "warning" | "success" | "danger"> = {
	TODO: "info",
	IN_PROGRESS: "warning",
	REVIEW: "info",
	DONE: "success",
	CANCELLED: "danger",
};

export const priorityTagType: Record<string, "info" | "warning" | "success" | "danger"> = {
	LOW: "info",
	MEDIUM: "warning",
	HIGH: "danger",
	CRITICAL: "danger",
};

export const typeAccent: Record<string, string> = {
	TASK: "var(--mt-color-gray-500)",
	FEATURE: "var(--mt-color-primary)",
	BUG: "var(--mt-color-danger)",
	RESEARCH: "#7C3AED",
};

export const columnAccent: Record<string, string> = {
	TODO: "var(--mt-color-primary)",
	IN_PROGRESS: "var(--mt-color-warning)",
	REVIEW: "var(--mt-color-primary)",
	DONE: "var(--mt-color-success)",
	CANCELLED: "var(--mt-color-gray-400)",
};

export const projectStatusDot: Record<string, string> = {
	PLANNED: "var(--mt-color-gray-400)",
	ACTIVE: "var(--mt-color-success)",
	COMPLETED: "var(--mt-color-primary)",
	ARCHIVED: "var(--mt-color-gray-400)",
};

/** Порядок для сортировки: от низкого приоритета к критическому */
export const PRIORITY_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

/** Порядок статусов по ходу работы, отменённые в конце */
export const STATUS_RANK: Record<string, number> = { TODO: 1, IN_PROGRESS: 2, REVIEW: 3, DONE: 4, CANCELLED: 5 };
