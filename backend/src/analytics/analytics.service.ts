import { Injectable } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";

import { getAvatarColor, getInitials } from "../common/avatar/avatar";
import { publicAvatarUrl } from "../common/avatar/files";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessService } from "../projects/project-access.service";
import { buildForecast } from "../tasks/forecast";

@Injectable()
export class AnalyticsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly projectAccess: ProjectAccessService,
	) {}

	async overview(user: AuthUser, projectId: string) {
		await this.projectAccess.assertCanView(projectId, user);

		const tasks = await this.prisma.task.findMany({ where: { projectId } });
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
			.map(
				(task) =>
					(task.completedAt!.getTime() - task.actualStartAt!.getTime()) / (1000 * 60 * 60),
			)
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

		const byRisk = { LOW: 0, MEDIUM: 0, HIGH: 0 };
		for (const task of tasks) {
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
				};
			}),
		);

		return items.sort((a, b) => b.activeTasks - a.activeTasks);
	}
}
