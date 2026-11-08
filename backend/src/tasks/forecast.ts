import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type ForecastSource = "ML" | "RULES";

export interface ForecastFactor {
	feature: string;
	label: string;
	impact: number;
	value?: string | number | null;
}

/** Сохранённый прогноз ML-сервиса (последняя запись task_predictions) */
export interface ForecastPrediction {
	durationHours: number | null;
	riskProbability: number | null;
	createdAt: Date;
	factors: unknown;
	durationModel?: { version: string; algorithm: string } | null;
	riskModel?: { version: string; algorithm: string } | null;
}

export interface ForecastInput {
	type: TaskType;
	priority: TaskPriority;
	status: TaskStatus;
	deadlineAt: Date | null;
	createdAt: Date;
	predictions?: ForecastPrediction[];
}

export interface TaskForecast {
	/** ML — прогноз обученной модели; RULES — простые правила, пока модели нет */
	source: ForecastSource;
	durationDays: number;
	durationHours: number;
	riskProbability: number;
	riskLevel: RiskLevel;
	calculatedAt: string;
	inputs: { code: string; value: string }[];
	factors: string[];
	/** Признаки, сильнее всего сдвинувшие вероятность срыва (только для ML) */
	riskFactors: ForecastFactor[];
	/** Признаки, сильнее всего сдвинувшие длительность (только для ML) */
	durationFactors: ForecastFactor[];
	models: { duration: string | null; risk: string | null } | null;
}

const BASE_DAYS: Record<TaskType, number> = {
	TASK: 3,
	FEATURE: 5,
	BUG: 2,
	RESEARCH: 4,
};

const PRIORITY_FACTOR: Record<TaskPriority, number> = {
	LOW: 1.15,
	MEDIUM: 1,
	HIGH: 0.85,
	CRITICAL: 0.7,
};

/** Пороги уровня риска: до 40% — низкий, 40–70% — средний, от 70% — высокий */
export const RISK_THRESHOLDS = { medium: 0.4, high: 0.7 };

export function levelOf(probability: number): RiskLevel {
	if (probability >= RISK_THRESHOLDS.high) return "HIGH";
	if (probability >= RISK_THRESHOLDS.medium) return "MEDIUM";
	return "LOW";
}

export function buildForecast(task: ForecastInput, now = new Date()): TaskForecast {
	const rules = buildRulesForecast(task, now);
	const prediction = task.predictions?.[0];
	const finished = task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELLED;
	if (!prediction || finished || (prediction.durationHours == null && prediction.riskProbability == null)) {
		return rules;
	}

	const durationHours = prediction.durationHours ?? rules.durationHours;
	let riskProbability = prediction.riskProbability ?? rules.riskProbability;
	const factors: string[] = [];
	// Срок уже прошёл, а задача открыта: это не прогноз, а факт
	if (rules.factors.includes("OVERDUE")) {
		factors.push("OVERDUE");
		riskProbability = Math.max(riskProbability, rules.riskProbability);
	}
	const stored = (prediction.factors ?? {}) as { risk?: ForecastFactor[]; duration?: ForecastFactor[] };
	riskProbability = Math.round(riskProbability * 100) / 100;

	return {
		...rules,
		source: "ML",
		durationHours: Math.round(durationHours * 10) / 10,
		durationDays: Math.max(1, Math.round(durationHours / 24)),
		riskProbability,
		riskLevel: levelOf(riskProbability),
		calculatedAt: prediction.createdAt.toISOString(),
		factors,
		riskFactors: prediction.riskProbability == null ? [] : (stored.risk ?? []),
		durationFactors: prediction.durationHours == null ? [] : (stored.duration ?? []),
		models: {
			duration: prediction.durationModel?.version ?? null,
			risk: prediction.riskModel?.version ?? null,
		},
	};
}

function buildRulesForecast(task: ForecastInput, now: Date): TaskForecast {
	const durationDays = Math.max(1, Math.round(BASE_DAYS[task.type] * PRIORITY_FACTOR[task.priority]));
	const factors: string[] = [];
	let risk = 0.22;

	if (task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELLED) {
		factors.push("FINISHED");
		risk = 0.08;
	} else if (!task.deadlineAt) {
		factors.push("NO_DEADLINE");
		risk = 0.34;
	} else {
		const daysLeft = (task.deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
		if (daysLeft < 0) {
			factors.push("OVERDUE");
			risk = 0.86;
		} else if (daysLeft < durationDays) {
			factors.push("TIGHT_DEADLINE");
			risk = 0.74;
		} else if (daysLeft < durationDays * 1.5) {
			factors.push("SHORT_BUFFER");
			risk = 0.48;
		} else {
			factors.push("ENOUGH_TIME");
			risk = 0.18;
		}
	}

	if (
		task.status !== TaskStatus.DONE &&
		task.status !== TaskStatus.CANCELLED &&
		(task.priority === TaskPriority.HIGH || task.priority === TaskPriority.CRITICAL)
	) {
		factors.push("HIGH_PRIORITY");
		risk = Math.min(0.95, risk + 0.08);
	}

	if (task.status === TaskStatus.TODO && task.deadlineAt) {
		factors.push("NOT_STARTED");
		risk = Math.min(0.95, risk + 0.05);
	}

	const riskProbability = Math.round(risk * 100) / 100;

	return {
		source: "RULES",
		durationDays,
		durationHours: durationDays * 24,
		riskProbability,
		riskLevel: levelOf(riskProbability),
		calculatedAt: now.toISOString(),
		inputs: [
			{ code: "type", value: task.type },
			{ code: "priority", value: task.priority },
			{ code: "status", value: task.status },
			{ code: "deadline", value: task.deadlineAt ? task.deadlineAt.toISOString() : "" },
		],
		factors,
		riskFactors: [],
		durationFactors: [],
		models: null,
	};
}
