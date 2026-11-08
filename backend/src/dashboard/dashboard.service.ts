import { Injectable } from "@nestjs/common";
import { SystemRole, TaskStatus } from "@prisma/client";

import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { toProjectDto } from "../projects/project.mapper";
import { latestPredictionInclude } from "../predictions/predictions.service";
import { buildForecast } from "../tasks/forecast";
import { toTaskDto } from "../tasks/task.mapper";

@Injectable()
export class DashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async get(user: AuthUser) {
		const projectWhere =
			user.systemRole === SystemRole.ADMIN
				? { status: { not: "ARCHIVED" as const } }
				: { status: { not: "ARCHIVED" as const }, members: { some: { userId: user.id } } };

		const openWhere = {
			status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
			...(user.systemRole === SystemRole.ADMIN ? {} : { project: { members: { some: { userId: user.id } } } }),
		};

		const [projects, myTasks, upcoming, openTasks] = await Promise.all([
			this.prisma.project.findMany({
				where: projectWhere,
				include: {
					owner: true,
					members: { include: { user: true } },
					_count: { select: { tasks: true, members: true } },
				},
				orderBy: { updatedAt: "desc" },
				take: 6,
			}),
			this.prisma.task.findMany({
				where: {
					assigneeId: user.id,
					status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW] },
				},
				include: {
					author: true,
					assignee: true,
					project: { select: { id: true, name: true, status: true } },
					_count: { select: { comments: true, subtasks: true } },
					...latestPredictionInclude,
				},
				orderBy: { deadlineAt: "asc" },
				take: 8,
			}),
			this.prisma.task.findMany({
				where: {
					deadlineAt: { not: null },
					status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
					project: user.systemRole === SystemRole.ADMIN ? undefined : { members: { some: { userId: user.id } } },
				},
				include: {
					author: true,
					assignee: true,
					project: { select: { id: true, name: true, status: true } },
					_count: { select: { comments: true, subtasks: true } },
					...latestPredictionInclude,
				},
				orderBy: { deadlineAt: "asc" },
				take: 6,
			}),
			this.prisma.task.findMany({ where: openWhere, include: latestPredictionInclude }),
		]);

		const now = new Date();

		return {
			summary: {
				active: openTasks.length,
				overdue: openTasks.filter((task) => task.deadlineAt && task.deadlineAt < now).length,
				highRisk: openTasks.filter((task) => buildForecast(task, now).riskLevel === "HIGH").length,
			},
			projects: projects.map((project) => toProjectDto(project)),
			myTasks: myTasks.map(toTaskDto),
			upcomingDeadlines: upcoming.map(toTaskDto),
		};
	}
}
