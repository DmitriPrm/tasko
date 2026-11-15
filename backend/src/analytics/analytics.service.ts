import { Injectable } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";

import { getAvatarColor, getInitials } from "../common/avatar/avatar";
import { publicAvatarUrl } from "../common/avatar/files";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessService } from "../projects/project-access.service";
import { latestPredictionInclude } from "../predictions/predictions.service";
import { buildForecast } from "../tasks/forecast";
import { toUserDto } from "../users/user.mapper";
import { compareDurations, summarizeRisks } from "./risk-analytics";

@Injectable()
export class AnalyticsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly projectAccess: ProjectAccessService,
	) {}

	async overview(user: AuthUser, projectId: string) {
		await this.projectAccess.assertCanView(projectId, user);

		const tasks = await this.prisma.task.findMany({ where: { projectId }, include: latestPredictionInclude });
		const now = new Date();

		const byStatus = Object.values(TaskStatus).reduce(
			(acc, status) => {
				acc[status] = tasks.filter((task) => task.status === status).length;
				return acc;
			},
			{} as Record<TaskStatus, number>,
		);

		const completed = tasks.filter((task) => task.status === TaskStatus.DONE);
		const overdue = tasks.filter(
			(task) =>
				task.deadlineAt &&
				task.deadlineAt < now &&
				task.status !== TaskStatus.DONE &&
				task.status !== TaskStatus.CANCELLED,
		);

		const completedOnTime = completed.filter((task) => {
			if (!task.deadlineAt || !task.completedAt) return false;
			return task.completedAt <= task.deadlineAt;
		});

		const durations = completed
			.filter((task) => task.actualStartAt && task.completedAt)
			.map((task) => (task.completedAt!.getTime() - task.actualStartAt!.getTime()) / (1000 * 60 * 60))
			.sort((a, b) => a - b);

		const averageDurationHours = durations.length
			? durations.reduce((sum, value) => sum + value, 0) / durations.length
			: 0;
		const middle = Math.floor(durations.length / 2);
		const medianDurationHours = durations.length
			? durations.length % 2
				? durations[middle]
				: (durations[middle - 1] + durations[middle]) / 2
			: 0;

		// Риск считаем только по открытым задачам: у закрытых исход уже известен
		const byRisk = { LOW: 0, MEDIUM: 0, HIGH: 0 };
		for (const task of tasks) {
			if (task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELLED || task.isCompleted) continue;
			byRisk[buildForecast(task, now).riskLevel] += 1;
		}

		return {
			total: tasks.length,
			byStatus,
			byRisk,
			completed: completed.length,
			overdue: overdue.length,
			onTimeRate: completed.length ? completedOnTime.length / completed.length : 0,
			averageDurationHours,
			medianDurationHours,
		};
	}

	/** Риски открытых задач и сравнение плановой, прогнозной и фактической длительности закрытых */
	async risks(user: AuthUser, projectId: string) {
		await this.projectAccess.assertCanView(projectId, user);
		const now = new Date();

		const [open, closed] = await Promise.all([
			this.prisma.task.findMany({
				where: { projectId, isCompleted: false, status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] } },
				include: { assignee: true, ...latestPredictionInclude },
			}),
			this.prisma.task.findMany({
				where: { projectId, status: TaskStatus.DONE, completedAt: { not: null } },
				orderBy: { completedAt: "desc" },
				take: 50,
				include: {
					// Первый прогноз — сделанный до начала работы, его и сравниваем с фактом
					predictions: { orderBy: { createdAt: "asc" }, take: 1, select: { durationHours: true } },
					statusHistory: {
						where: { toStatus: TaskStatus.IN_PROGRESS },
						orderBy: { changedAt: "asc" },
						take: 1,
						select: { changedAt: true },
					},
				},
			}),
		]);

		const { byRisk, ranked } = summarizeRisks(open.map((task) => ({ task, forecast: buildForecast(task, now) })));
		const durations = compareDurations(
			closed.map((task) => ({
				id: task.id,
				status: task.status,
				createdAt: task.createdAt,
				actualStartAt: task.actualStartAt,
				completedAt: task.completedAt,
				deadlineAt: task.deadlineAt,
				plannedStartAt: task.plannedStartAt,
				firstProgressAt: task.statusHistory[0]?.changedAt ?? null,
				predictedHours: task.predictions[0]?.durationHours ?? null,
			})),
		);
		const titles = new Map(closed.map((task) => [task.id, task.title]));

		return {
			byRisk,
			tasks: ranked.map(({ task, forecast }) => ({
				id: task.id,
				title: task.title,
				status: task.status,
				deadlineAt: task.deadlineAt?.toISOString() ?? null,
				assignee: task.assignee ? toUserDto(task.assignee) : null,
				riskLevel: forecast.riskLevel,
				riskProbability: forecast.riskProbability,
				durationHours: forecast.durationHours,
				source: forecast.source,
			})),
			durations: {
				summary: durations.summary,
				rows: durations.rows.map((row) => ({ ...row, title: titles.get(row.taskId) ?? "" })),
			},
		};
	}

	async workload(user: AuthUser, projectId: string) {
		await this.projectAccess.assertCanView(projectId, user);

		const members = await this.prisma.projectMember.findMany({
			where: { projectId },
			include: { user: true },
		});

		const activeStatuses: TaskStatus[] = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW];

		const counts = await this.prisma.task.groupBy({
			by: ["assigneeId"],
			where: { projectId, assigneeId: { not: null }, status: { in: activeStatuses } },
			_count: { _all: true },
		});
		const activeByUser = new Map(counts.map((item) => [item.assigneeId, item._count._all]));

		// Суммарная прогнозная длительность открытых задач исполнителя (раздел 6.7 спецификации)
		const now = new Date();
		const openTasks = await this.prisma.task.findMany({
			where: { projectId, assigneeId: { not: null }, status: { in: activeStatuses }, isCompleted: false },
			include: latestPredictionInclude,
		});
		const forecastByUser = new Map<string, number>();
		for (const task of openTasks) {
			const hours = buildForecast(task, now).durationHours;
			forecastByUser.set(task.assigneeId as string, (forecastByUser.get(task.assigneeId as string) ?? 0) + hours);
		}

		const items = await Promise.all(
			members.map(async (member) => {
				const activeTasks = activeByUser.get(member.userId) ?? 0;

				return {
					userId: member.userId,
					fullName: member.user.fullName,
					email: member.user.email,
					initials: getInitials(member.user.fullName),
					avatarColor: getAvatarColor(member.user.id),
					avatarUrl: publicAvatarUrl(member.user.avatarFile, member.user.updatedAt),
					activeTasks,
					forecastHours: Math.round(forecastByUser.get(member.userId) ?? 0),
				};
			}),
		);

		return items.sort((a, b) => b.activeTasks - a.activeTasks);
	}
}
