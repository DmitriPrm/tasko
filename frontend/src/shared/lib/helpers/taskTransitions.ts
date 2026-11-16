import type { TaskStatus } from "@/shared/api/v0/schemas";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"];

function targets(from: TaskStatus): TaskStatus[] {
	return STATUSES.filter((status) => status !== from);
}

export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
	TODO: targets("TODO"),
	IN_PROGRESS: targets("IN_PROGRESS"),
	REVIEW: targets("REVIEW"),
	DONE: targets("DONE"),
	CANCELLED: targets("CANCELLED"),
};

export const BOARD_COLUMNS: TaskStatus[] = STATUSES;

/** Строгая схема (включает администратор): та же, что проверяет сервер */
export const STRICT_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
	TODO: ["IN_PROGRESS", "CANCELLED"],
	IN_PROGRESS: ["REVIEW", "TODO", "CANCELLED"],
	REVIEW: ["DONE", "IN_PROGRESS", "CANCELLED"],
	DONE: ["IN_PROGRESS"],
	CANCELLED: ["TODO"],
};

export function allowedTransitions(from: TaskStatus, strict: boolean) {
	return (strict ? STRICT_TRANSITIONS : TASK_TRANSITIONS)[from];
}
