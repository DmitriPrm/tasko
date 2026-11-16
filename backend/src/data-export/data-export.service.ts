import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, TaskStatus } from "@prisma/client";
import { createHmac } from "crypto";

import { AccessService } from "../access/access.service";
import { AuthUser } from "../auth/auth.types";
import { deadlineMissed, durationHours, HistoryTask } from "../predictions/prediction-input";
import { latestPredictionInclude } from "../predictions/predictions.service";
import { PrismaService } from "../prisma/prisma.service";
import { buildForecast } from "../tasks/forecast";
import { toCsv } from "./csv";

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : "");
const round = (value: number | null) => (value === null ? "" : Math.round(value * 10) / 10);

/** Выгрузки данных и журнал действий для администратора */
@Injectable()
export class DataExportService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly access: AccessService,
		private readonly config: ConfigService,
	) {}

	/** Все задачи (или задачи проекта) — для отчётов в Excel */
	async tasksCsv(user: AuthUser, projectId?: string) {
		await this.access.assert(user, "SETTINGS_SYSTEM");
		const now = new Date();
		const tasks = await this.prisma.task.findMany({
			where: projectId ? { projectId } : {},
			orderBy: { createdAt: "asc" },
			include: {
				project: { select: { name: true } },
				author: { select: { fullName: true } },
				assignee: { select: { fullName: true } },
				...this.historyInclude,
				...latestPredictionInclude,
			},
		});

		const rows = tasks.map((task) => {
			const history = this.toHistory(task);
			const missed = deadlineMissed(history);
			const forecast = buildForecast(task, now);
			const open = task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED && !task.isCompleted;
			return [
				task.id,
				task.project.name,
				task.title,
				task.type,
				task.priority,
				task.status,
				task.author.fullName,
				task.assignee?.fullName ?? "",
				iso(task.createdAt),
				iso(task.plannedStartAt),
				iso(task.deadlineAt),
				iso(history.actualStartAt ?? history.firstProgressAt),
				iso(task.completedAt),
				round(durationHours(history)),
				missed === null ? "" : missed ? "да" : "нет",
				open ? forecast.riskLevel : "",
				open ? Math.round(forecast.riskProbability * 100) : "",
				open ? forecast.source : "",
			];
		});

		return toCsv(
			[
				"id",
				"Проект",
				"Название",
				"Тип",
				"Приоритет",
				"Статус",
				"Автор",
				"Исполнитель",
				"Создана",
				"Плановый старт",
				"Срок",
				"Начата",
				"Завершена",
				"Длительность, ч",
				"Срок сорван",
				"Уровень риска",
				"Риск, %",
				"Источник прогноза",
			],
			rows,
		);
	}

	/**
	 * Обезличенный набор для обучения и анализа ML (раздел 14 спецификации):
	 * без имён, почты, названий и описаний; идентификаторы заменены стойкими псевдонимами
	 * (HMAC) — по ним можно связать задачи одного исполнителя, но нельзя узнать, кто это.
	 */
	async mlDatasetCsv(user: AuthUser) {
		await this.access.assert(user, "SETTINGS_SYSTEM");
		const tasks = await this.prisma.task.findMany({
			orderBy: { createdAt: "asc" },
			include: {
				...this.historyInclude,
				_count: { select: { tags: true, dependenciesIn: true } },
			},
		});

		const rows = tasks.map((task) => {
			const history = this.toHistory(task);
			const missed = deadlineMissed(history);
			return [
				this.alias("task", task.id),
				this.alias("project", task.projectId),
				task.assigneeId ? this.alias("user", task.assigneeId) : "",
				task.parentTaskId ? this.alias("task", task.parentTaskId) : "",
				task.type,
				task.priority,
				task.status,
				task.title.length,
				(task.description ?? "").length,
				(task.description ?? "").split(/\s+/).filter(Boolean).length,
				task._count.tags,
				task._count.dependenciesIn,
				iso(task.createdAt),
				iso(task.plannedStartAt),
				iso(task.deadlineAt),
				iso(history.firstProgressAt ?? history.actualStartAt),
				iso(task.completedAt),
				iso(history.cancelledAt),
				round(durationHours(history)),
				missed === null ? "" : missed ? 1 : 0,
			];
		});

		return toCsv(
			[
				"task",
				"project",
				"assignee",
				"parent_task",
				"type",
				"priority",
				"status",
				"title_len",
				"description_len",
				"description_words",
				"tags_count",
				"dependencies_count",
				"created_at",
				"planned_start_at",
				"deadline_at",
				"first_progress_at",
				"completed_at",
				"cancelled_at",
				"duration_hours",
				"deadline_missed",
			],
			rows,
		);
	}

	/** Журнал действий: смены статусов и полей задач, новые сверху, постранично */
	async audit(user: AuthUser, query: { page?: number; perPage?: number; projectId?: string; userId?: string }) {
		await this.access.assert(user, "SETTINGS_SYSTEM");
		const page = Math.max(1, query.page ?? 1);
		const perPage = Math.min(100, Math.max(1, query.perPage ?? 20));
		const where = {
			...(query.projectId ? { task: { projectId: query.projectId } } : {}),
			...(query.userId ? { changedBy: query.userId } : {}),
		};
		const include = {
			actor: { select: { id: true, fullName: true } },
			task: { select: { id: true, title: true, project: { select: { id: true, name: true } } } },
		};
		// Две таблицы истории сливаем по времени: берём нужное число строк из каждой
		const take = page * perPage;
		const [statuses, fields, statusTotal, fieldTotal] = await Promise.all([
			this.prisma.taskStatusHistory.findMany({ where, include, orderBy: { changedAt: "desc" }, take }),
			this.prisma.taskChangeHistory.findMany({ where, include, orderBy: { changedAt: "desc" }, take }),
			this.prisma.taskStatusHistory.count({ where }),
			this.prisma.taskChangeHistory.count({ where }),
		]);

		const merged = [
			...statuses.map((item) => ({
				id: `s-${item.id}`,
				kind: "status" as const,
				field: "status",
				oldValue: item.fromStatus,
				newValue: item.toStatus,
				comment: item.comment,
				changedAt: item.changedAt,
				actor: item.actor,
				task: item.task,
			})),
			...fields.map((item) => ({
				id: `f-${item.id}`,
				kind: "field" as const,
				field: item.fieldName,
				oldValue: item.oldValue,
				newValue: item.newValue,
				comment: null,
				changedAt: item.changedAt,
				actor: item.actor,
				task: item.task,
			})),
		].sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());

		const pageItems = merged.slice((page - 1) * perPage, page * perPage);

		// Исполнитель хранится в истории как id — показываем имя
		const userIds = new Set(
			pageItems
				.filter((item) => item.field === "assigneeId")
				.flatMap((item) => [item.oldValue, item.newValue])
				.filter((value): value is string => Boolean(value)),
		);
		const names = new Map(
			(userIds.size
				? await this.prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, fullName: true } })
				: []
			).map((item) => [item.id, item.fullName]),
		);
		const display = (field: string, value: string | null) =>
			field === "assigneeId" && value ? (names.get(value) ?? value) : value;

		return {
			items: pageItems.map((item) => ({
				...item,
				oldValue: display(item.field, item.oldValue),
				newValue: display(item.field, item.newValue),
				changedAt: item.changedAt.toISOString(),
			})),
			total: statusTotal + fieldTotal,
			page,
			perPage,
		};
	}

	private readonly historyInclude = {
		statusHistory: {
			where: { toStatus: { in: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED] } },
			select: { toStatus: true, changedAt: true },
			orderBy: { changedAt: "asc" },
		},
	} satisfies Prisma.TaskInclude;

	private toHistory(task: {
		id: string;
		status: TaskStatus;
		createdAt: Date;
		actualStartAt: Date | null;
		completedAt: Date | null;
		deadlineAt: Date | null;
		statusHistory: { toStatus: TaskStatus; changedAt: Date }[];
	}): HistoryTask {
		return {
			id: task.id,
			status: task.status,
			createdAt: task.createdAt,
			actualStartAt: task.actualStartAt,
			completedAt: task.completedAt,
			deadlineAt: task.deadlineAt,
			firstProgressAt: task.statusHistory.find((item) => item.toStatus === TaskStatus.IN_PROGRESS)?.changedAt ?? null,
			cancelledAt: task.statusHistory.find((item) => item.toStatus === TaskStatus.CANCELLED)?.changedAt ?? null,
		};
	}

	/** Стойкий псевдоним: один и тот же id всегда даёт одно значение, но обратно его не восстановить */
	private alias(kind: string, id: string) {
		const secret = this.config.get<string>("DATA_EXPORT_SECRET") || this.config.getOrThrow<string>("JWT_ACCESS_SECRET");
		return createHmac("sha256", secret).update(`${kind}:${id}`).digest("hex").slice(0, 16);
	}
}
