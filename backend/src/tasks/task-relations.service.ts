import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DependencyType, Task, User } from "@prisma/client";

import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { toUserDto } from "../users/user.mapper";
import { wouldCreateCycle } from "./dependency-graph";
import { CreateDependencyDto } from "./dto/create-dependency.dto";
import { TasksService } from "./tasks.service";

const briefInclude = { assignee: true } as const;

function toBriefTask(task: Task & { assignee: User | null }) {
	return {
		id: task.id,
		title: task.title,
		status: task.status,
		isCompleted: task.isCompleted,
		deadlineAt: task.deadlineAt?.toISOString() ?? null,
		assignee: task.assignee ? toUserDto(task.assignee) : null,
	};
}

/** Подзадачи и связи между задачами одного проекта */
@Injectable()
export class TaskRelationsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly tasks: TasksService,
	) {}

	async subtasks(user: AuthUser, taskId: string) {
		await this.tasks.getViewableTask(user, taskId);
		const items = await this.prisma.task.findMany({
			where: { parentTaskId: taskId },
			include: briefInclude,
			orderBy: { createdAt: "asc" },
		});
		return items.map(toBriefTask);
	}

	async dependencies(user: AuthUser, taskId: string) {
		await this.tasks.getViewableTask(user, taskId);
		const [outgoing, incoming] = await Promise.all([
			this.prisma.taskDependency.findMany({
				where: { sourceTaskId: taskId },
				include: { target: { include: briefInclude } },
				orderBy: { createdAt: "asc" },
			}),
			this.prisma.taskDependency.findMany({
				where: { targetTaskId: taskId },
				include: { source: { include: briefInclude } },
				orderBy: { createdAt: "asc" },
			}),
		]);

		return {
			/** Эти задачи нужно закончить раньше текущей */
			blockedBy: incoming
				.filter((item) => item.type === DependencyType.BLOCKS)
				.map((item) => ({ dependencyId: item.id, task: toBriefTask(item.source) })),
			/** Текущая задача мешает начать эти */
			blocks: outgoing
				.filter((item) => item.type === DependencyType.BLOCKS)
				.map((item) => ({ dependencyId: item.id, task: toBriefTask(item.target) })),
			related: [
				...outgoing
					.filter((item) => item.type === DependencyType.RELATED)
					.map((item) => ({ dependencyId: item.id, task: toBriefTask(item.target) })),
				...incoming
					.filter((item) => item.type === DependencyType.RELATED)
					.map((item) => ({ dependencyId: item.id, task: toBriefTask(item.source) })),
			],
		};
	}

	async addDependency(user: AuthUser, taskId: string, dto: CreateDependencyDto) {
		const task = await this.tasks.getEditableTask(user, taskId);
		if (dto.taskId === taskId) {
			throw new BadRequestException("Задача не может зависеть от самой себя");
		}

		const other = await this.prisma.task.findUnique({ where: { id: dto.taskId } });
		if (!other || other.projectId !== task.projectId) {
			throw new BadRequestException("Связывать можно только задачи одного проекта");
		}

		// «Текущая зависит от другой» хранится как «другая блокирует текущую»
		const [sourceTaskId, targetTaskId] = dto.kind === "DEPENDS_ON" ? [other.id, task.id] : [task.id, other.id];
		const type = dto.kind === "RELATED" ? DependencyType.RELATED : DependencyType.BLOCKS;

		const existing = await this.prisma.taskDependency.findFirst({
			where: {
				OR: [
					{ sourceTaskId, targetTaskId },
					{ sourceTaskId: targetTaskId, targetTaskId: sourceTaskId },
				],
			},
		});
		if (existing) {
			throw new ConflictException("Эти задачи уже связаны");
		}

		if (type === DependencyType.BLOCKS) {
			const edges = await this.prisma.taskDependency.findMany({
				where: { type: DependencyType.BLOCKS, source: { projectId: task.projectId } },
				select: { sourceTaskId: true, targetTaskId: true },
			});
			if (wouldCreateCycle(edges, sourceTaskId, targetTaskId)) {
				throw new BadRequestException("Такая связь замкнёт цепочку блокировок в круг");
			}
		}

		await this.prisma.taskDependency.create({
			data: { sourceTaskId, targetTaskId, type, createdBy: user.id },
		});
		return this.dependencies(user, taskId);
	}

	async removeDependency(user: AuthUser, taskId: string, dependencyId: string) {
		await this.tasks.getEditableTask(user, taskId);
		const dependency = await this.prisma.taskDependency.findUnique({ where: { id: dependencyId } });
		if (!dependency || (dependency.sourceTaskId !== taskId && dependency.targetTaskId !== taskId)) {
			throw new NotFoundException("Связь не найдена");
		}
		await this.prisma.taskDependency.delete({ where: { id: dependencyId } });
		return this.dependencies(user, taskId);
	}
}
