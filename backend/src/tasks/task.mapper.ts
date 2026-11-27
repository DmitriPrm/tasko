import { Project, Tag, Task, User } from "@prisma/client";

import { toTagDto } from "../projects/project.mapper";
import { toUserDto } from "../users/user.mapper";
import { buildForecast, ForecastPrediction } from "./forecast";
import { isTaskStarted } from "./task.constants";

type TaskWithRelations = Task & {
	author: User;
	assignee?: User | null;
	project?: Pick<Project, "id" | "name" | "status">;
	tags?: { tag: Tag }[];
	coAssignees?: { user: User }[];
	parentTask?: { id: string; title: string } | null;
	dependenciesIn?: { id: string }[];
	_count?: { comments: number; subtasks: number; attachments?: number };
	predictions?: ForecastPrediction[];
};

export function toTaskDto(task: TaskWithRelations) {
	return {
		id: task.id,
		projectId: task.projectId,
		authorId: task.authorId,
		assigneeId: task.assigneeId,
		parentTaskId: task.parentTaskId,
		columnId: task.columnId,
		title: task.title,
		description: task.description,
		type: task.type,
		priority: task.priority,
		status: task.status,
		isCompleted: task.isCompleted,
		plannedStartAt: task.plannedStartAt?.toISOString() ?? null,
		deadlineAt: task.deadlineAt?.toISOString() ?? null,
		actualStartAt: task.actualStartAt?.toISOString() ?? null,
		completedAt: task.completedAt?.toISOString() ?? null,
		createdAt: task.createdAt.toISOString(),
		updatedAt: task.updatedAt.toISOString(),
		author: toUserDto(task.author),
		assignee: task.assignee ? toUserDto(task.assignee) : null,
		coAssignees: task.coAssignees?.map((item) => toUserDto(item.user)) ?? [],
		tags: task.tags?.map((item) => toTagDto(item.tag)) ?? [],
		project: task.project ? { id: task.project.id, name: task.project.name, status: task.project.status } : undefined,
		commentsCount: task._count?.comments ?? 0,
		subtasksCount: task._count?.subtasks ?? 0,
		attachmentsCount: task._count?.attachments ?? 0,
		isStarted: isTaskStarted(task),
		parentTask: task.parentTask ? { id: task.parentTask.id, title: task.parentTask.title } : null,
		openBlockersCount: task.dependenciesIn?.length ?? 0,
		forecast: buildForecast(task),
	};
}
