import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { NotificationType, Prisma, ProjectRole, TaskStatus } from "@prisma/client";

import { latestPredictionInclude } from "../predictions/predictions.service";
import { PrismaService } from "../prisma/prisma.service";
import { SystemSettingsService } from "../system-settings/system-settings.service";
import { buildForecast } from "../tasks/forecast";

/**
 * Уведомление о высоком риске срыва срока: исполнителю, соисполнителям и менеджерам проекта.
 * Каждому человеку — один раз на задачу. Проверка раз в час (риск растёт сам по мере приближения
 * срока) и сразу после пересчёта прогноза.
 */
@Injectable()
export class RiskAlertsService {
	private readonly logger = new Logger(RiskAlertsService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly settings: SystemSettingsService,
	) {}

	@Cron(CronExpression.EVERY_HOUR)
	async handleCron() {
		try {
			const created = await this.notify();
			if (created) this.logger.log(`Уведомлений о высоком риске: ${created}`);
		} catch (error) {
			this.logger.error("Не удалось разослать уведомления о высоком риске", error as Error);
		}
	}

	/** Проверить одну задачу; ошибки не пробрасываются — сохранение задачи важнее уведомления */
	async checkTask(taskId: string) {
		try {
			return await this.notify({ id: taskId });
		} catch (error) {
			this.logger.warn(`Проверка риска задачи ${taskId}: ${error instanceof Error ? error.message : error}`);
			return 0;
		}
	}

	/** Возвращает число созданных уведомлений */
	async notify(where: Prisma.TaskWhereInput = {}, now = new Date()) {
		const { alertsEnabled, alertManagers } = this.settings.section("risk");
		if (!alertsEnabled) return 0;
		const tasks = await this.prisma.task.findMany({
			where: {
				...where,
				isCompleted: false,
				status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
			},
			include: {
				...latestPredictionInclude,
				coAssignees: { select: { userId: true } },
				project: {
					select: { members: { where: { projectRole: ProjectRole.MANAGER }, select: { userId: true } } },
				},
				notifications: { where: { type: NotificationType.HIGH_RISK }, select: { userId: true } },
			},
		});

		const data = tasks.flatMap((task) => {
			const forecast = buildForecast(task, now);
			if (forecast.riskLevel !== "HIGH") return [];
			const recipients = new Set(
				[
					task.assigneeId,
					...task.coAssignees.map((item) => item.userId),
					...(alertManagers ? task.project.members.map((m) => m.userId) : []),
				].filter((id): id is string => Boolean(id)),
			);
			const notified = new Set(task.notifications.map((item) => item.userId));
			const percent = Math.round(forecast.riskProbability * 100);
			return [...recipients]
				.filter((userId) => !notified.has(userId))
				.map((userId) => ({
					userId,
					type: NotificationType.HIGH_RISK,
					title: "Высокий риск срыва срока",
					body: `Задача «${task.title}» может не успеть к сроку: риск ${percent}%`,
					relatedTaskId: task.id,
				}));
		});

		if (!data.length) return 0;
		await this.prisma.notification.createMany({ data });
		return data.length;
	}
}
