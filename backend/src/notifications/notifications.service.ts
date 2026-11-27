import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationType, Task, TaskStatus } from "@prisma/client";

import { AuthUser } from "../auth/auth.types";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { readPreferences } from "../users/user-preferences";

/** Уведомление, которое нужно доставить одному пользователю */
export interface NotificationDraft {
	userId: string;
	type: NotificationType;
	title: string;
	body: string;
	relatedTaskId?: string | null;
}

const escapeHtml = (value: string) =>
	value.replace(
		/[&<>"']/g,
		(char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
	);

const STATUS_LABELS: Record<TaskStatus, string> = {
	TODO: "К выполнению",
	IN_PROGRESS: "В работе",
	REVIEW: "На проверке",
	DONE: "Готово",
	CANCELLED: "Отменена",
};

@Injectable()
export class NotificationsService {
	private readonly logger = new Logger(NotificationsService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly mail: MailService,
		private readonly config: ConfigService,
	) {}

	/**
	 * Единственный путь создания уведомлений: учитывает личные настройки каждого получателя.
	 * Отключённое в системе уведомление сохраняется приглушённым (muted) — по нему напоминания понимают,
	 * что человеку уже сообщали, и не шлют письма повторно. Письмо уходит, если пользователь включил почту.
	 */
	async deliver(drafts: NotificationDraft[]) {
		if (!drafts.length) return 0;
		const users = await this.prisma.user.findMany({
			where: { id: { in: [...new Set(drafts.map((item) => item.userId))] }, isActive: true },
			select: { id: true, email: true, preferences: true },
		});
		const byId = new Map(users.map((user) => [user.id, { ...user, prefs: readPreferences(user.preferences) }]));
		const items = drafts.filter((item) => byId.has(item.userId));
		if (!items.length) return 0;

		await this.prisma.notification.createMany({
			data: items.map((item) => {
				const muted = !byId.get(item.userId)!.prefs.notifications[item.type].inApp;
				return {
					userId: item.userId,
					type: item.type,
					title: item.title,
					body: item.body,
					relatedTaskId: item.relatedTaskId ?? null,
					muted,
					isRead: muted,
				};
			}),
		});

		const appUrl = (this.config.get<string>("FRONTEND_URL") ?? "").replace(/\/+$/, "");
		for (const item of items) {
			const user = byId.get(item.userId)!;
			if (!user.prefs.notifications[item.type].email) continue;
			const link = appUrl ? `${appUrl}/notifications` : "";
			await this.mail
				.send({
					to: user.email,
					subject: `TASKO: ${item.title}`,
					text: [item.body, link].filter(Boolean).join("\n\n"),
					html: `<p>${escapeHtml(item.body)}</p>${link ? `<p><a href="${link}">Открыть TASKO</a></p>` : ""}`,
				})
				.catch((error) => this.logger.warn(`Письмо не отправлено: ${error instanceof Error ? error.message : error}`));
		}
		return items.filter((item) => byId.get(item.userId)!.prefs.notifications[item.type].inApp).length;
	}

	/** Уведомления постранично, новые сверху */
	async list(user: AuthUser, query: { page?: number; perPage?: number; unreadOnly?: boolean } = {}) {
		const page = query.page ?? 1;
		const perPage = query.perPage ?? 20;
		const where = { userId: user.id, muted: false, ...(query.unreadOnly ? { isRead: false } : {}) };

		const [items, total] = await this.prisma.$transaction([
			this.prisma.notification.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * perPage,
				take: perPage,
			}),
			this.prisma.notification.count({ where }),
		]);

		const rows = items.map((item) => ({
			id: item.id,
			type: item.type,
			title: item.title,
			body: item.body,
			relatedTaskId: item.relatedTaskId,
			isRead: item.isRead,
			createdAt: item.createdAt.toISOString(),
		}));
		return { items: rows, total, page, perPage };
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
			where: { userId: user.id, isRead: false, muted: false },
		});

		return { count };
	}

	async notifyProjectInvitation(userId: string, inviterName: string, projectName: string) {
		await this.deliver([
			{
				userId,
				type: NotificationType.PROJECT_INVITATION,
				title: "Приглашение в проект",
				body: `${inviterName} приглашает вас в проект «${projectName}»`,
			},
		]);
	}

	async notifyAssignee(userId: string, taskId: string, title: string) {
		await this.deliver([
			{
				userId,
				type: NotificationType.TASK_ASSIGNED,
				title: "Назначение на задачу",
				body: `Вас назначили исполнителем задачи «${title}»`,
				relatedTaskId: taskId,
			},
		]);
	}

	async notifyDeadlineChanged(task: Task, actorId: string) {
		const recipientIds = [task.assigneeId, task.authorId].filter((id): id is string => Boolean(id) && id !== actorId);

		await this.deliver(
			recipientIds.map((userId) => ({
				userId,
				type: NotificationType.DEADLINE_CHANGED,
				title: "Изменён срок задачи",
				body: `Срок задачи «${task.title}» был изменён`,
				relatedTaskId: task.id,
			})),
		);
	}

	async notifyStatusChanged(task: Task, actorId: string, fromStatus: TaskStatus, toStatus: TaskStatus) {
		const recipientIds = [task.assigneeId, task.authorId].filter((id): id is string => Boolean(id) && id !== actorId);

		await this.deliver(
			recipientIds.map((userId) => ({
				userId,
				type: NotificationType.STATUS_CHANGED,
				title: "Изменён статус задачи",
				body: `Задача «${task.title}»: ${STATUS_LABELS[fromStatus]} → ${STATUS_LABELS[toStatus]}`,
				relatedTaskId: task.id,
			})),
		);
	}
}
