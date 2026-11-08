import { Injectable } from "@nestjs/common";
import { NotificationType, Task, TaskStatus } from "@prisma/client";

import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

const STATUS_LABELS: Record<TaskStatus, string> = {
	TODO: "К выполнению",
	IN_PROGRESS: "В работе",
	REVIEW: "На проверке",
	DONE: "Готово",
	CANCELLED: "Отменена",
};

@Injectable()
export class NotificationsService {
	constructor(private readonly prisma: PrismaService) {}

	async list(user: AuthUser) {
		const items = await this.prisma.notification.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: "desc" },
			take: 50,
		});

		return items.map((item) => ({
			id: item.id,
			type: item.type,
			title: item.title,
			body: item.body,
			relatedTaskId: item.relatedTaskId,
			isRead: item.isRead,
			createdAt: item.createdAt.toISOString(),
		}));
	}

	async markRead(user: AuthUser, id: string) {
		const notification = await this.prisma.notification.updateMany({
			where: { id, userId: user.id },
			data: { isRead: true },
		});

		return { success: notification.count > 0 };
	}

	async markAllRead(user: AuthUser) {
		await this.prisma.notification.updateMany({
			where: { userId: user.id, isRead: false },
			data: { isRead: true },
		});

		return { success: true };
	}

	async unreadCount(user: AuthUser) {
		const count = await this.prisma.notification.count({
			where: { userId: user.id, isRead: false },
		});

		return { count };
	}

	async notifyProjectInvitation(userId: string, inviterName: string, projectName: string) {
		await this.prisma.notification.create({
			data: {
				userId,
				type: NotificationType.PROJECT_INVITATION,
				title: "Приглашение в проект",
				body: `${inviterName} приглашает вас в проект «${projectName}»`,
			},
		});
	}

	async notifyAssignee(userId: string, taskId: string, title: string) {
		await this.prisma.notification.create({
			data: {
				userId,
				type: NotificationType.TASK_ASSIGNED,
				title: "Назначение на задачу",
				body: `Вас назначили исполнителем задачи «${title}»`,
				relatedTaskId: taskId,
			},
		});
	}

	async notifyDeadlineChanged(task: Task, actorId: string) {
		const recipientIds = [task.assigneeId, task.authorId].filter((id): id is string => Boolean(id) && id !== actorId);

		await this.prisma.notification.createMany({
			data: recipientIds.map((userId) => ({
				userId,
				type: NotificationType.DEADLINE_CHANGED,
				title: "Изменён срок задачи",
				body: `Срок задачи «${task.title}» был изменён`,
				relatedTaskId: task.id,
			})),
		});
	}

	async notifyStatusChanged(task: Task, actorId: string, fromStatus: TaskStatus, toStatus: TaskStatus) {
		const recipientIds = [task.assigneeId, task.authorId].filter((id): id is string => Boolean(id) && id !== actorId);

		await this.prisma.notification.createMany({
			data: recipientIds.map((userId) => ({
				userId,
				type: NotificationType.STATUS_CHANGED,
				title: "Изменён статус задачи",
				body: `Задача «${task.title}»: 				${STATUS_LABELS[fromStatus]} → ${STATUS_LABELS[toStatus]}`,
				relatedTaskId: task.id,
			})),
		});
	}
}
