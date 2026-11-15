import { durationHours, HistoryTask } from "../predictions/prediction-input";
import { RiskLevel, TaskForecast } from "../tasks/forecast";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface RiskEntry<T> {
	task: T;
	forecast: TaskForecast;
}

/** Сколько открытых задач на каждом уровне риска и сами задачи — от самых рискованных */
export function summarizeRisks<T>(entries: RiskEntry<T>[], limit = 50) {
	const byRisk: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
	for (const entry of entries) byRisk[entry.forecast.riskLevel] += 1;
	const ranked = [...entries].sort((a, b) => b.forecast.riskProbability - a.forecast.riskProbability).slice(0, limit);
	return { byRisk, ranked };
}

export interface ClosedTask extends HistoryTask {
	plannedStartAt: Date | null;
	/** Первый прогноз ML по задаче — тот, что был до начала работы */
	predictedHours: number | null;
}

/**
 * Плановая длительность — от планового старта (или создания) до конца дня срока.
 * Срок — это день, поэтому закрыть задачу в течение этого дня — вовремя.
 */
export function plannedHours(task: ClosedTask): number | null {
	if (!task.deadlineAt) return null;
	const start = task.plannedStartAt ?? task.createdAt;
	const hours = (task.deadlineAt.getTime() + DAY_MS - start.getTime()) / HOUR_MS;
	return hours > 0 ? hours : null;
}

const round = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);
const average = (values: number[]) =>
	values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

/** Сравнение плановой, прогнозной и фактической длительности закрытых задач */
export function compareDurations(tasks: ClosedTask[]) {
	const rows = tasks.map((task) => {
		const actual = durationHours(task);
		const predicted = task.predictedHours;
		return {
			taskId: task.id,
			plannedHours: round(plannedHours(task)),
			predictedHours: round(predicted),
			actualHours: round(actual),
			/** Прогноз минус факт: плюс — модель переоценила, минус — недооценила */
			errorHours: predicted !== null && actual !== null ? round(predicted - actual) : null,
		};
	});

	const errors = rows.map((row) => row.errorHours).filter((value): value is number => value !== null);
	const pick = (key: "plannedHours" | "predictedHours" | "actualHours") =>
		round(average(rows.map((row) => row[key]).filter((value): value is number => value !== null)));

	return {
		rows,
		summary: {
			closed: rows.length,
			withPrediction: errors.length,
			/** Средняя абсолютная ошибка прогноза, часы */
			maeHours: round(average(errors.map(Math.abs))),
			avgPlannedHours: pick("plannedHours"),
			avgPredictedHours: pick("predictedHours"),
			avgActualHours: pick("actualHours"),
		},
	};
}
