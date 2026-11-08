import { Injectable, Logger } from "@nestjs/common";
import { DependencyType, ModelKind, Prisma, PredictionTrigger, TaskStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { MlClient, MlModelInfo, MlModelsInfo } from "./ml-client";
import { buildPredictionInput, HistoryTask } from "./prediction-input";

/** Последний прогноз задачи с версиями моделей — подключается в include запросов задач */
export const latestPredictionInclude = {
	predictions: {
		orderBy: { createdAt: "desc" },
		take: 1,
		include: {
			durationModel: { select: { version: true, algorithm: true } },
			riskModel: { select: { version: true, algorithm: true } },
		},
	},
} satisfies Prisma.TaskInclude;

export type StoredPrediction = Prisma.TaskPredictionGetPayload<{
	include: (typeof latestPredictionInclude)["predictions"]["include"];
}>;

const historySelect = {
	id: true,
	status: true,
	createdAt: true,
	actualStartAt: true,
	completedAt: true,
	deadlineAt: true,
	statusHistory: {
		where: { toStatus: { in: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED] } },
		select: { toStatus: true, changedAt: true },
		orderBy: { changedAt: "asc" },
	},
} satisfies Prisma.TaskSelect;

type HistoryRow = Prisma.TaskGetPayload<{ select: typeof historySelect }>;

function toHistoryTask(row: HistoryRow): HistoryTask {
	return {
		id: row.id,
		status: row.status,
		createdAt: row.createdAt,
		actualStartAt: row.actualStartAt,
		completedAt: row.completedAt,
		deadlineAt: row.deadlineAt,
		firstProgressAt: row.statusHistory.find((item) => item.toStatus === TaskStatus.IN_PROGRESS)?.changedAt ?? null,
		cancelledAt: row.statusHistory.find((item) => item.toStatus === TaskStatus.CANCELLED)?.changedAt ?? null,
	};
}

/** Закрытые задачи не прогнозируем: длительность и исход уже известны */
const FINISHED: TaskStatus[] = [TaskStatus.DONE, TaskStatus.CANCELLED];

@Injectable()
export class PredictionsService {
	private readonly logger = new Logger(PredictionsService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly ml: MlClient,
	) {}

	get enabled() {
		return this.ml.enabled;
	}

	/**
	 * Пересчитать прогноз задачи и сохранить его. Возвращает новый прогноз или null, если
	 * сервис выключен/недоступен или задача уже закрыта. Никогда не бросает исключение.
	 */
	async refresh(taskId: string, trigger: PredictionTrigger): Promise<StoredPrediction | null> {
		if (!this.ml.enabled) return null;
		try {
			return await this.compute(taskId, trigger);
		} catch (error) {
			this.logger.warn(`Прогноз задачи ${taskId} не сохранён: ${error instanceof Error ? error.message : error}`);
			return null;
		}
	}

	async status() {
		if (!this.ml.enabled) return { enabled: false, available: false, models: null };
		const models = await this.ml.modelsInfo();
		return { enabled: true, available: models !== null, models };
	}

	history(taskId: string, take = 20) {
		return this.prisma.taskPrediction.findMany({
			where: { taskId },
			orderBy: { createdAt: "desc" },
			take,
			include: latestPredictionInclude.predictions.include,
		});
	}

	private async compute(taskId: string, trigger: PredictionTrigger) {
		const task = await this.prisma.task.findUnique({
			where: { id: taskId },
			include: {
				_count: { select: { tags: true } },
				dependenciesIn: {
					where: {
						type: DependencyType.BLOCKS,
						source: { status: { notIn: FINISHED }, isCompleted: false },
					},
					select: { id: true },
				},
			},
		});
		if (!task || FINISHED.includes(task.status) || task.isCompleted) return null;

		const [assigneeRows, projectRows] = await Promise.all([
			task.assigneeId
				? this.prisma.task.findMany({ where: { assigneeId: task.assigneeId }, select: historySelect })
				: Promise.resolve(null),
			this.prisma.task.findMany({ where: { projectId: task.projectId }, select: historySelect }),
		]);

		const input = buildPredictionInput(
			{
				id: task.id,
				type: task.type,
				priority: task.priority,
				title: task.title,
				description: task.description,
				deadlineAt: task.deadlineAt,
				plannedStartAt: task.plannedStartAt,
				parentTaskId: task.parentTaskId,
				assigneeId: task.assigneeId,
				tagsCount: task._count.tags,
				openBlockersCount: task.dependenciesIn.length,
			},
			assigneeRows?.map(toHistoryTask) ?? null,
			projectRows.map(toHistoryTask),
		);

		const result = await this.ml.predict(input);
		if (!result) return null;
		if (result.predictedDurationHours == null && result.deadlineRiskProbability == null) return null;

		const info = { loaded: null as MlModelsInfo | null };
		const durationModelId = await this.modelId(ModelKind.DURATION, result.durationModelVersion, info);
		const riskModelId = await this.modelId(ModelKind.RISK, result.riskModelVersion, info);

		return this.prisma.taskPrediction.create({
			data: {
				taskId,
				trigger,
				durationHours: result.predictedDurationHours,
				riskProbability: result.deadlineRiskProbability,
				durationModelId,
				riskModelId,
				factors: {
					risk: result.topFactors ?? [],
					duration: result.durationFactors ?? [],
				} as unknown as Prisma.InputJsonValue,
				input: input as unknown as Prisma.InputJsonValue,
			},
			include: latestPredictionInclude.predictions.include,
		});
	}

	/** id версии модели в model_versions; новую версию заводим по сведениям из /models/info */
	private async modelId(kind: ModelKind, version: string | null, info: { loaded: MlModelsInfo | null }) {
		if (!version) return null;
		const existing = await this.prisma.modelVersion.findUnique({ where: { version }, select: { id: true } });
		if (existing) return existing.id;

		info.loaded ??= await this.ml.modelsInfo();
		const details: MlModelInfo | null | undefined =
			kind === ModelKind.DURATION ? info.loaded?.duration : info.loaded?.risk;
		const matches = details?.version === version;
		const created = await this.prisma.modelVersion.upsert({
			where: { version },
			update: {},
			create: {
				kind,
				version,
				algorithm: matches ? details.algorithm : "unknown",
				trainedAt: matches && details.trainedAt ? new Date(details.trainedAt) : null,
				sampleSize: matches ? (details.sampleSize ?? null) : null,
				dataSource: matches ? (details.dataSource ?? null) : null,
				metrics: matches && details.metrics ? (details.metrics as Prisma.InputJsonValue) : undefined,
			},
			select: { id: true },
		});
		return created.id;
	}
}
