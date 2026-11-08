import { TaskStatus } from "@prisma/client";

const STATUSES = Object.values(TaskStatus);

function targets(from: TaskStatus) {
	return STATUSES.filter((status) => status !== from);
}

export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
	[TaskStatus.TODO]: targets(TaskStatus.TODO),
	[TaskStatus.IN_PROGRESS]: targets(TaskStatus.IN_PROGRESS),
	[TaskStatus.REVIEW]: targets(TaskStatus.REVIEW),
	[TaskStatus.DONE]: targets(TaskStatus.DONE),
	[TaskStatus.CANCELLED]: targets(TaskStatus.CANCELLED),
};

const STARTED_STATUSES: TaskStatus[] = [TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE];

/** Задача уже была в работе: её нельзя удалить, только отменить */
export function isTaskStarted(task: { status: TaskStatus; actualStartAt: Date | null }) {
	return Boolean(task.actualStartAt) || STARTED_STATUSES.includes(task.status);
}
