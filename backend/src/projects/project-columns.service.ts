import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TaskStatus } from "@prisma/client";

import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateColumnDto } from "./dto/create-column.dto";
import { ColumnTasksAction, DeleteColumnQueryDto } from "./dto/delete-column-query.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";
import { ProjectAccessService } from "./project-access.service";

export const DEFAULT_COLUMNS: { name: string; color: string; status: TaskStatus }[] = [
	{ name: "К выполнению", color: "#2563EB", status: TaskStatus.TODO },
	{ name: "В работе", color: "#F59E0B", status: TaskStatus.IN_PROGRESS },
	{ name: "На проверке", color: "#7C3AED", status: TaskStatus.REVIEW },
	{ name: "Готово", color: "#10B981", status: TaskStatus.DONE },
	{ name: "Отменена", color: "#9CA3AF", status: TaskStatus.CANCELLED },
];

type Db = PrismaService | Prisma.TransactionClient;

export function toColumnDto(column: {
	id: string;
	projectId: string;
	name: string;
	color: string;
	status: TaskStatus;
	position: number;
	_count?: { tasks: number };
}) {
	return {
		id: column.id,
		projectId: column.projectId,
		name: column.name,
		color: column.color,
		status: column.status,
		position: column.position,
		tasksCount: column._count?.tasks ?? 0,
	};
}

/** Создаёт колонки по умолчанию, если у проекта их ещё нет, и раскладывает по ним задачи */
export async function ensureDefaultColumns(prisma: PrismaService, projectId: string) {
	const existing = await prisma.projectColumn.count({ where: { projectId } });
	if (existing > 0) return;

	await prisma.$transaction(async (tx) => {
		for (const [index, item] of DEFAULT_COLUMNS.entries()) {
			const column = await tx.projectColumn.create({
				data: { projectId, position: index, ...item },
			});
			await tx.task.updateMany({
				where: { projectId, status: item.status, columnId: null },
				data: { columnId: column.id },
			});
		}
	});
}

/** Первая колонка проекта с нужным статусом (для переходов по статусу и создания задач) */
export async function findColumnByStatus(db: Db, projectId: string, status: TaskStatus) {
	return db.projectColumn.findFirst({
		where: { projectId, status },
		orderBy: { position: "asc" },
	});
}

@Injectable()
export class ProjectColumnsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly projectAccess: ProjectAccessService,
	) {}

	async list(user: AuthUser, projectId: string) {
		await this.projectAccess.assertCanView(projectId, user);
		await ensureDefaultColumns(this.prisma, projectId);
		const columns = await this.prisma.projectColumn.findMany({
			where: { projectId },
			orderBy: { position: "asc" },
			include: { _count: { select: { tasks: true } } },
		});
		return columns.map(toColumnDto);
	}

	async create(user: AuthUser, projectId: string, dto: CreateColumnDto) {
		await this.projectAccess.assertCanManage(projectId, user);
		await ensureDefaultColumns(this.prisma, projectId);

		const columns = await this.prisma.projectColumn.findMany({
			where: { projectId },
			orderBy: { position: "asc" },
		});

		let insertAt = columns.length;
		let status: TaskStatus = TaskStatus.TODO;
		if (dto.afterColumnId) {
			const index = columns.findIndex((column) => column.id === dto.afterColumnId);
			if (index === -1) throw new NotFoundException("Колонка не найдена");
			insertAt = index + 1;
			status = columns[index].status;
		} else if (columns.length) {
			status = columns[columns.length - 1].status;
		}

		const created = await this.prisma.$transaction(async (tx) => {
			await tx.projectColumn.updateMany({
				where: { projectId, position: { gte: insertAt } },
				data: { position: { increment: 1 } },
			});
			return tx.projectColumn.create({
				data: {
					projectId,
					name: dto.name.trim(),
					color: dto.color ?? "#2563EB",
					status,
					position: insertAt,
				},
				include: { _count: { select: { tasks: true } } },
			});
		});

		return toColumnDto(created);
	}

	async update(user: AuthUser, projectId: string, columnId: string, dto: UpdateColumnDto) {
		await this.projectAccess.assertCanManage(projectId, user);
		await this.getColumnOrThrow(projectId, columnId);

		const name = dto.name?.trim();
		if (dto.name !== undefined && !name) {
			throw new BadRequestException("Название колонки не может быть пустым");
		}

		const updated = await this.prisma.projectColumn.update({
			where: { id: columnId },
			data: {
				...(name ? { name } : {}),
				...(dto.color ? { color: dto.color } : {}),
			},
			include: { _count: { select: { tasks: true } } },
		});
		return toColumnDto(updated);
	}

	async remove(user: AuthUser, projectId: string, columnId: string, query: DeleteColumnQueryDto) {
		await this.projectAccess.assertCanManage(projectId, user);
		const column = await this.getColumnOrThrow(projectId, columnId);

		const total = await this.prisma.projectColumn.count({ where: { projectId } });
		if (total <= 1) {
			throw new BadRequestException("Нельзя удалить последнюю колонку проекта");
		}

		const tasksCount = await this.prisma.task.count({ where: { columnId } });
		if (tasksCount > 0 && !query.tasks) {
			throw new BadRequestException("Укажите, что сделать с задачами колонки");
		}

		await this.prisma.$transaction(async (tx) => {
			if (tasksCount > 0 && query.tasks === ColumnTasksAction.MOVE) {
				if (!query.targetColumnId || query.targetColumnId === columnId) {
					throw new BadRequestException("Выберите колонку для переноса задач");
				}
				const target = await tx.projectColumn.findFirst({
					where: { id: query.targetColumnId, projectId },
				});
				if (!target) throw new NotFoundException("Колонка для переноса не найдена");

				const tasks = await tx.task.findMany({
					where: { columnId },
					select: { id: true, status: true },
				});
				for (const task of tasks) {
					await tx.task.update({
						where: { id: task.id },
						data: {
							columnId: target.id,
							status: target.status,
							...(task.status !== target.status
								? {
										completedAt: target.status === TaskStatus.DONE ? new Date() : undefined,
										statusHistory: {
											create: {
												fromStatus: task.status,
												toStatus: target.status,
												changedBy: user.id,
												comment: `Перенос из удалённой колонки «${column.name}»`,
											},
										},
									}
								: {}),
						},
					});
				}
			} else if (tasksCount > 0) {
				const ids = (await tx.task.findMany({ where: { columnId }, select: { id: true } })).map((task) => task.id);
				// Подзадачи удаляемых задач не должны блокировать удаление
				await tx.task.updateMany({ where: { parentTaskId: { in: ids } }, data: { parentTaskId: null } });
				await tx.task.deleteMany({ where: { id: { in: ids } } });
			}

			await tx.projectColumn.delete({ where: { id: columnId } });
			await tx.projectColumn.updateMany({
				where: { projectId, position: { gt: column.position } },
				data: { position: { decrement: 1 } },
			});
		});

		return { success: true };
	}

	private async getColumnOrThrow(projectId: string, columnId: string) {
		const column = await this.prisma.projectColumn.findFirst({ where: { id: columnId, projectId } });
		if (!column) throw new NotFoundException("Колонка не найдена");
		return column;
	}
}
