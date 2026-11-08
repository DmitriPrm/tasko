import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DependencyType, Prisma, ProjectRole, SystemRole, TaskStatus } from "@prisma/client";

import { AccessService } from "../access/access.service";
import { AuthUser } from "../auth/auth.types";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessService } from "../projects/project-access.service";
import { ensureDefaultColumns, findColumnByStatus } from "../projects/project-columns.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { TasksQueryDto } from "./dto/tasks-query.dto";
import { TransitionTaskDto } from "./dto/transition-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { isTaskStarted, TASK_TRANSITIONS } from "./task.constants";
import { getTaskFields } from "./task.form";
import { toTaskDto } from "./task.mapper";

const DAY_MS = 24 * 60 * 60 * 1000;

const taskInclude = {
	author: true,
	assignee: true,
	project: { select: { id: true, name: true, status: true } },
	tags: { include: { tag: true } },
	coAssignees: { include: { user: true } },
	parentTask: { select: { id: true, title: true } },
	// Незакрытые задачи, которые блокируют эту: по ним карточка показывает замок
	dependenciesIn: {
		where: {
			type: DependencyType.BLOCKS,
			source: { status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] }, isCompleted: false },
		},
		select: { id: true },
	},
	_count: { select: { comments: true, subtasks: true, attachments: true } },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly projectAccess: ProjectAccessService,
		private readonly notifications: NotificationsService,
		private readonly access: AccessService,
	) {}

	async listByProject(user: AuthUser, projectId: string, query: TasksQueryDto) {
		await this.projectAccess.assertCanView(projectId, user);
		return this.list(user, { ...query, projectId });
	}

	async list(user: AuthUser, query: TasksQueryDto) {
		const page = query.page ?? 1;
		const perPage = query.perPage ?? 20;

		const where: Prisma.TaskWhereInput = {
			...(query.projectId ? { projectId: query.projectId } : {}),
			...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
			...(query.status ? { status: query.status } : {}),
			...(query.priority ? { priority: query.priority } : {}),
			...(query.type ? { type: query.type } : {}),
			...(query.search ? { title: { contains: query.search, mode: "insensitive" } } : {}),
			...(user.systemRole === SystemRole.ADMIN ? {} : { project: { members: { some: { userId: user.id } } } }),
		};

		const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

		const [items, total] = await this.prisma.$transaction([
			this.prisma.task.findMany({
				where,
				include: taskInclude,
				orderBy,
				skip: (page - 1) * perPage,
				take: perPage,
			}),
			this.prisma.task.count({ where }),
		]);

		return {
			items: items.map(toTaskDto),
			total,
			page,
			perPage,
		};
	}

	async getById(user: AuthUser, taskId: string) {
		const task = await this.getTaskOrThrow(taskId);
		await this.projectAccess.assertCanView(task.projectId, user);
		return {
			...toTaskDto(task),
			canEdit: await this.canEdit(user, task.projectId, task.authorId),
		};
	}

	async getCreateForm(user: AuthUser, projectId: string) {
		const project = await this.projectAccess.assertCanView(projectId, user);
		return {
			fields: getTaskFields({
				members: project.members.map((member) => member.user),
			}),
		};
	}

	async getEditForm(user: AuthUser, taskId: string) {
		const task = await this.getTaskOrThrow(taskId);
		const project = await this.projectAccess.assertCanView(task.projectId, user);
		return {
			fields: getTaskFields({
				task,
				members: project.members.map((member) => member.user),
			}),
		};
	}

	async create(user: AuthUser, projectId: string, dto: CreateTaskDto) {
		await this.access.assert(user, "TASKS_CREATE");
		await this.projectAccess.assertCanView(projectId, user);
		this.assertDates(dto.plannedStartAt, dto.deadlineAt);

		if (dto.assigneeId) {
			await this.assertAssignee(projectId, dto.assigneeId);
		}

		if (dto.parentTaskId) {
			const parent = await this.getTaskOrThrow(dto.parentTaskId);
			if (parent.projectId !== projectId) {
				throw new BadRequestException("Родительская задача должна быть в том же проекте");
			}
		}

		const column = await this.resolveColumn(projectId, dto.columnId);
		const status = column?.status ?? TaskStatus.TODO;

		const task = await this.prisma.task.create({
			data: {
				projectId,
				columnId: column?.id,
				status,
				actualStartAt: status === TaskStatus.IN_PROGRESS ? new Date() : null,
				completedAt: status === TaskStatus.DONE ? new Date() : null,
				authorId: user.id,
				assigneeId: dto.assigneeId,
				parentTaskId: dto.parentTaskId,
				title: dto.title,
				description: dto.description,
				type: dto.type,
				priority: dto.priority,
				plannedStartAt: dto.plannedStartAt ? new Date(dto.plannedStartAt) : null,
				deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : null,
				statusHistory: {
					create: {
						fromStatus: null,
						toStatus: status,
						changedBy: user.id,
						comment: "Создание задачи",
					},
				},
			},
			include: taskInclude,
		});

		if (dto.assigneeId && dto.assigneeId !== user.id) {
			await this.notifications.notifyAssignee(dto.assigneeId, task.id, task.title);
		}

		return toTaskDto(task);
	}

	async update(user: AuthUser, taskId: string, dto: UpdateTaskDto) {
		await this.access.assert(user, "TASKS_EDIT");
		const task = await this.getTaskOrThrow(taskId);
		await this.assertCanEdit(user, task.projectId, task.authorId);
		if (dto.assigneeId !== undefined && dto.assigneeId !== task.assigneeId) {
			await this.access.assert(user, "TASKS_ASSIGN");
		}

		if (dto.assigneeId) {
			await this.assertAssignee(task.projectId, dto.assigneeId);
		}

		this.assertDates(
			dto.plannedStartAt === undefined ? task.plannedStartAt?.toISOString() : (dto.plannedStartAt ?? undefined),
			dto.deadlineAt === undefined ? task.deadlineAt?.toISOString() : (dto.deadlineAt ?? undefined),
			task.createdAt,
		);

		const changes: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }> = [];
		const track = (fieldName: string, oldValue: unknown, newValue: unknown) => {
			const oldText = oldValue == null ? null : String(oldValue);
			const newText = newValue == null ? null : String(newValue);
			if (oldText !== newText) {
				changes.push({ fieldName, oldValue: oldText, newValue: newText });
			}
		};

		if (dto.title !== undefined) track("title", task.title, dto.title);
		if (dto.description !== undefined) track("description", task.description, dto.description);
		if (dto.type !== undefined) track("type", task.type, dto.type);
		if (dto.priority !== undefined) track("priority", task.priority, dto.priority);
		if (dto.assigneeId !== undefined) track("assigneeId", task.assigneeId, dto.assigneeId);
		if (dto.isCompleted !== undefined) track("isCompleted", task.isCompleted, dto.isCompleted);
		if (dto.plannedStartAt !== undefined) {
			track("plannedStartAt", task.plannedStartAt?.toISOString() ?? null, dto.plannedStartAt);
		}
		if (dto.deadlineAt !== undefined) {
			track("deadlineAt", task.deadlineAt?.toISOString() ?? null, dto.deadlineAt);
		}

		if (dto.coAssigneeIds) {
			for (const userId of dto.coAssigneeIds) {
				await this.assertAssignee(task.projectId, userId);
			}
		}

		if (dto.tagIds) {
			const uniqueTagIds = [...new Set(dto.tagIds)];
			const tags = await this.prisma.tag.findMany({
				where: { id: { in: uniqueTagIds }, projectId: task.projectId },
			});
			if (tags.length !== uniqueTagIds.length) {
				throw new BadRequestException("Тег не принадлежит проекту");
			}
		}

		const updated = await this.prisma.task.update({
			where: { id: taskId },
			data: {
				title: dto.title,
				description: dto.description,
				type: dto.type,
				priority: dto.priority,
				assigneeId: dto.assigneeId,
				isCompleted: dto.isCompleted,
				completedAt: this.resolveCompletedAt(task, dto.isCompleted),
				plannedStartAt:
					dto.plannedStartAt === undefined ? undefined : dto.plannedStartAt ? new Date(dto.plannedStartAt) : null,
				deadlineAt: dto.deadlineAt === undefined ? undefined : dto.deadlineAt ? new Date(dto.deadlineAt) : null,
				changeHistory: {
					create: changes.map((change) => ({
						...change,
						changedBy: user.id,
					})),
				},
				...(dto.tagIds
					? {
							tags: {
								deleteMany: {},
								create: [...new Set(dto.tagIds)].map((tagId) => ({ tagId })),
							},
						}
					: {}),
				...(dto.coAssigneeIds
					? {
							coAssignees: {
								deleteMany: {},
								create: [...new Set(dto.coAssigneeIds)].map((userId) => ({ userId })),
							},
						}
					: {}),
			},
			include: taskInclude,
		});

		if (dto.assigneeId && dto.assigneeId !== task.assigneeId && dto.assigneeId !== user.id) {
			await this.notifications.notifyAssignee(dto.assigneeId, updated.id, updated.title);
		}

		const nextDeadline = dto.deadlineAt ? new Date(dto.deadlineAt).getTime() : null;
		if (dto.deadlineAt !== undefined && nextDeadline !== (task.deadlineAt?.getTime() ?? null)) {
			await this.notifications.notifyDeadlineChanged(updated, user.id);
		}

		return toTaskDto(updated);
	}

	async transition(user: AuthUser, taskId: string, dto: TransitionTaskDto) {
		await this.access.assert(user, "TASKS_TRANSITION");
		const task = await this.getTaskOrThrow(taskId);
		await this.assertCanTransition(user, task);

		if (!dto.status && !dto.columnId) {
			throw new BadRequestException("Укажите статус или колонку");
		}

		const column = dto.columnId
			? await this.resolveColumn(task.projectId, dto.columnId)
			: await this.resolveColumnByStatus(task.projectId, dto.status as TaskStatus);
		const nextStatus = column?.status ?? (dto.status as TaskStatus);

		// Перенос между колонками с одним статусом: меняется только положение
		if (nextStatus === task.status) {
			if (column && column.id === task.columnId) return toTaskDto(task);
			const moved = await this.prisma.task.update({
				where: { id: taskId },
				data: { columnId: column?.id },
				include: taskInclude,
			});
			return toTaskDto(moved);
		}

		const allowed = TASK_TRANSITIONS[task.status];
		if (!allowed.includes(nextStatus)) {
			throw new BadRequestException("Недопустимый переход статуса");
		}

		const updated = await this.prisma.task.update({
			where: { id: taskId },
			data: {
				status: nextStatus,
				columnId: column?.id,
				actualStartAt: nextStatus === TaskStatus.IN_PROGRESS && !task.actualStartAt ? new Date() : task.actualStartAt,
				completedAt: nextStatus === TaskStatus.DONE ? new Date() : task.completedAt,
				statusHistory: {
					create: {
						fromStatus: task.status,
						toStatus: nextStatus,
						changedBy: user.id,
						comment: dto.comment,
					},
				},
			},
			include: taskInclude,
		});

		await this.notifications.notifyStatusChanged(updated, user.id, task.status, nextStatus);
		return toTaskDto(updated);
	}

	async remove(user: AuthUser, taskId: string) {
		await this.access.assert(user, "TASKS_DELETE");
		const task = await this.getTaskOrThrow(taskId);
		await this.assertCanEdit(user, task.projectId, task.authorId);

		// Начатую задачу не стираем: её история нужна для аудита и обучающей выборки
		if (isTaskStarted(task)) {
			if (task.status !== TaskStatus.CANCELLED) {
				const column = await this.resolveColumnByStatus(task.projectId, TaskStatus.CANCELLED);
				const cancelled = await this.prisma.task.update({
					where: { id: taskId },
					data: {
						status: TaskStatus.CANCELLED,
						columnId: column?.id,
						statusHistory: {
							create: {
								fromStatus: task.status,
								toStatus: TaskStatus.CANCELLED,
								changedBy: user.id,
								comment: "Отменена вместо удаления",
							},
						},
					},
				});
				await this.notifications.notifyStatusChanged(cancelled, user.id, task.status, TaskStatus.CANCELLED);
			}
			return { success: true, cancelled: true };
		}

		await this.prisma.task.delete({ where: { id: taskId } });
		return { success: true, cancelled: false };
	}

	async history(user: AuthUser, taskId: string) {
		const task = await this.getTaskOrThrow(taskId);
		await this.projectAccess.assertCanView(task.projectId, user);

		const [statusHistory, changeHistory] = await Promise.all([
			this.prisma.taskStatusHistory.findMany({
				where: { taskId },
				include: { actor: true },
				orderBy: { changedAt: "desc" },
			}),
			this.prisma.taskChangeHistory.findMany({
				where: { taskId },
				include: { actor: true },
				orderBy: { changedAt: "desc" },
			}),
		]);

		// В истории исполнитель хранится как id; для показа подставляем имя
		const userIds = new Set<string>();
		for (const item of changeHistory) {
			if (item.fieldName !== "assigneeId") continue;
			if (item.oldValue) userIds.add(item.oldValue);
			if (item.newValue) userIds.add(item.newValue);
		}
		const users = userIds.size
			? await this.prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, fullName: true } })
			: [];
		const names = new Map(users.map((item) => [item.id, item.fullName]));
		const display = (fieldName: string, value: string | null) =>
			fieldName === "assigneeId" && value ? (names.get(value) ?? value) : value;

		return {
			statusHistory: statusHistory.map((item) => ({
				id: item.id,
				fromStatus: item.fromStatus,
				toStatus: item.toStatus,
				comment: item.comment,
				changedAt: item.changedAt.toISOString(),
				actor: {
					id: item.actor.id,
					fullName: item.actor.fullName,
				},
			})),
			changeHistory: changeHistory.map((item) => ({
				id: item.id,
				fieldName: item.fieldName,
				oldValue: display(item.fieldName, item.oldValue),
				newValue: display(item.fieldName, item.newValue),
				changedAt: item.changedAt.toISOString(),
				actor: {
					id: item.actor.id,
					fullName: item.actor.fullName,
				},
			})),
		};
	}

	/** Задача, которую пользователь может смотреть (для связей, подзадач, вложений) */
	async getViewableTask(user: AuthUser, taskId: string) {
		const task = await this.getTaskOrThrow(taskId);
		await this.projectAccess.assertCanView(task.projectId, user);
		return task;
	}

	/** Задача, которую пользователь может менять: те же права, что на редактирование полей */
	async getEditableTask(user: AuthUser, taskId: string) {
		await this.access.assert(user, "TASKS_EDIT");
		const task = await this.getTaskOrThrow(taskId);
		await this.assertCanEdit(user, task.projectId, task.authorId);
		return task;
	}

	/** Колонка для новой/перенесённой задачи: указанная или первая «К выполнению» */
	private async resolveColumn(projectId: string, columnId?: string) {
		if (columnId) {
			const column = await this.prisma.projectColumn.findFirst({ where: { id: columnId, projectId } });
			if (!column) {
				throw new BadRequestException("Колонка не найдена в этом проекте");
			}
			return column;
		}
		return this.resolveColumnByStatus(projectId, TaskStatus.TODO);
	}

	private async resolveColumnByStatus(projectId: string, status: TaskStatus) {
		await ensureDefaultColumns(this.prisma, projectId);
		return findColumnByStatus(this.prisma, projectId, status);
	}

	private async getTaskOrThrow(taskId: string) {
		const task = await this.prisma.task.findUnique({
			where: { id: taskId },
			include: taskInclude,
		});

		if (!task) {
			throw new NotFoundException("Задача не найдена");
		}

		return task;
	}

	private async assertAssignee(projectId: string, userId: string) {
		const isMember = await this.projectAccess.isActiveProjectMember(projectId, userId);
		if (!isMember) {
			throw new BadRequestException("Исполнителем может быть только активный участник проекта");
		}
	}

	private async canEdit(user: AuthUser, projectId: string, authorId: string) {
		try {
			await this.assertCanEdit(user, projectId, authorId);
			return true;
		} catch {
			return false;
		}
	}

	private async assertCanEdit(user: AuthUser, projectId: string, authorId: string) {
		if (user.systemRole === SystemRole.ADMIN) {
			return;
		}

		const project = await this.projectAccess.assertCanView(projectId, user);
		const membership = project.members.find((member) => member.userId === user.id);
		if (membership?.projectRole === ProjectRole.MANAGER || authorId === user.id) {
			return;
		}

		throw new ForbiddenException("Недостаточно прав для изменения задачи");
	}

	private async assertCanTransition(user: AuthUser, task: { projectId: string; assigneeId: string | null }) {
		if (user.systemRole === SystemRole.ADMIN) {
			return;
		}

		const project = await this.projectAccess.assertCanView(task.projectId, user);
		const membership = project.members.find((member) => member.userId === user.id);
		if (membership?.projectRole === ProjectRole.MANAGER || task.assigneeId === user.id) {
			return;
		}

		throw new ForbiddenException("Недостаточно прав для смены статуса");
	}

	private resolveCompletedAt(task: { status: TaskStatus; completedAt: Date | null }, isCompleted?: boolean) {
		if (isCompleted === undefined) return undefined;
		if (isCompleted) return task.completedAt ?? new Date();
		return task.status === TaskStatus.DONE ? task.completedAt : null;
	}

	private assertDates(plannedStartAt?: string | null, deadlineAt?: string | null, createdAt: Date = new Date()) {
		// Дата из календаря приходит как начало дня в поясе пользователя, поэтому сравниваем с запасом в сутки:
		// срок «сегодня» допустим в любом часовом поясе, а вчерашний — нет
		if (deadlineAt && new Date(deadlineAt).getTime() < createdAt.getTime() - DAY_MS) {
			throw new BadRequestException("Дедлайн не может быть раньше даты создания");
		}

		if (plannedStartAt && deadlineAt && new Date(deadlineAt) < new Date(plannedStartAt)) {
			throw new BadRequestException("Дедлайн должен быть позже планового старта");
		}
	}

	private buildOrderBy(
		sortBy?: TasksQueryDto["sortBy"],
		sortOrder?: TasksQueryDto["sortOrder"],
	): Prisma.TaskOrderByWithRelationInput {
		const order = sortOrder ?? "desc";
		if (sortBy === "deadlineAt") return { deadlineAt: order };
		if (sortBy === "priority") {
			return { priority: order };
		}
		return { createdAt: order };
	}
}
