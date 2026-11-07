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
