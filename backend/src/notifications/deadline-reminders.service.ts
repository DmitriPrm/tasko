import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { NotificationType, TaskStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_WINDOW_HOURS = 24;

/** Раз в час напоминает исполнителям о задачах, срок которых скоро наступит */
@Injectable()
export class DeadlineRemindersService {
	private readonly logger = new Logger(DeadlineRemindersService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly config: ConfigService,
	) {}

	@Cron(CronExpression.EVERY_HOUR)
	async handleCron() {
		try {
			const created = await this.sendReminders();
			if (created) this.logger.log(`Напоминаний о сроке: ${created}`);
		} catch (error) {
			this.logger.error("Не удалось разослать напоминания о сроке", error as Error);
		}
	}

	/** Возвращает число созданных уведомлений */
	async sendReminders(now = new Date()) {
		const windowHours = Number(this.config.get("DEADLINE_REMINDER_HOURS")) || DEFAULT_WINDOW_HOURS;
		const until = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

		const tasks = await this.prisma.task.findMany({
			where: {
				deadlineAt: { gte: now, lte: until },
				status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
				isCompleted: false,
			},
			select: {
				id: true,
				title: true,
				deadlineAt: true,
				assigneeId: true,
				coAssignees: { select: { userId: true } },
				// Одно напоминание на задачу и человека: уже отправленные не повторяем
				notifications: { where: { type: NotificationType.DEADLINE_APPROACHING }, select: { userId: true } },
			},
		});

		const data = tasks.flatMap((task) => {
			const recipients = new Set(
				[task.assigneeId, ...task.coAssignees.map((item) => item.userId)].filter((id): id is string => Boolean(id)),
			);
			const reminded = new Set(task.notifications.map((item) => item.userId));
			return [...recipients]
				.filter((userId) => !reminded.has(userId))
				.map((userId) => ({
					userId,
					type: NotificationType.DEADLINE_APPROACHING,
					title: "Скоро срок задачи",
					body: `Срок задачи «${task.title}» наступает ${formatDeadline(task.deadlineAt as Date)}`,
					relatedTaskId: task.id,
				}));
		});

		if (!data.length) return 0;
		await this.prisma.notification.createMany({ data });
		return data.length;
	}
}

function formatDeadline(date: Date) {
	return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}
