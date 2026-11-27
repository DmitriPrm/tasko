import type { TaskForecast } from "@/shared/api/v0/schemas";
import { i18n, translate } from "@/shared/lib/theming/i18n/translate";

export type ForecastFactor = TaskForecast["riskFactors"][number];

/** Признаки «да/нет»: при значении 0 пишем «Нет исполнителя», а не «Есть исполнитель» */
const NEGATED = new Set(["has_deadline", "has_planned_start", "has_assignee", "is_subtask"]);

export const riskTagType = { LOW: "success", MEDIUM: "warning", HIGH: "danger" } as const;

export const riskLevelLabel = (forecast: TaskForecast) => translate(`forecast.${forecast.riskLevel.toLowerCase()}`);

export const percent = (value: number) => `${Math.round(value * 100)}%`;

export function durationText(forecast: TaskForecast) {
	const hours = forecast.durationHours ?? forecast.durationDays * 24;
	const h = translate("forecast.hours");
	if (hours < 24) return `≈ ${Math.max(1, Math.round(hours))} ${h}`;
	return `≈ ${Math.round(hours / 24)} ${translate("forecast.days")} (${Math.round(hours)} ${h})`;
}

/** Подпись признака: перевод по ключу, иначе подпись от ML-сервиса */
export function factorLabel(factor: ForecastFactor) {
	const negated = NEGATED.has(factor.feature) && factor.value === 0;
	const key = `forecast.${negated ? "featureNot" : "feature"}.${factor.feature}`;
	const label = i18n.global.te(key) ? translate(key) : factor.label;
	return factor.value === null ? `${label} (${translate("forecast.noData")})` : label;
}

// Вклады меньше 0,5 п.п. риска или получаса работы — шум: не показываем
export const visibleRiskFactors = (forecast: TaskForecast) =>
	forecast.riskFactors.filter((item) => Math.abs(item.impact) >= 0.005);
export const visibleDurationFactors = (forecast: TaskForecast) =>
	forecast.durationFactors.filter((item) => Math.abs(item.impact) >= 0.5);

const sign = (value: number) => (value > 0 ? "+" : "−");
export const riskImpact = (factor: ForecastFactor) =>
	`${sign(factor.impact)}${Math.abs(Math.round(factor.impact * 100))}%`;
export const durationImpact = (factor: ForecastFactor) =>
	`${sign(factor.impact)}${Math.abs(Math.round(factor.impact))} ${translate("forecast.hours")}`;
export const impactTitle = (factor: ForecastFactor) =>
	translate(factor.impact > 0 ? "forecast.raises" : "forecast.lowers");

/** Причины по правилам (OVERDUE, TIGHT_DEADLINE…) в виде текста */
export const ruleFactorLabels = (forecast: TaskForecast) =>
	forecast.factors.map((code) => translate(`forecast.factor.${code}`));

export type RiskLevel = TaskForecast["riskLevel"];
export const RISK_LEVELS: RiskLevel[] = ["HIGH", "MEDIUM", "LOW"];

type ForecastTask = {
	status: string;
	isCompleted?: boolean | null;
	forecast?: TaskForecast | null;
};

/** Прогноз имеет смысл только для открытой задачи: у закрытой исход уже известен */
export function openTaskForecast(task: ForecastTask): TaskForecast | null {
	if (!task.forecast || task.isCompleted || task.status === "DONE" || task.status === "CANCELLED") return null;
	return task.forecast;
}

/** Значение для сортировки по риску: закрытые задачи — в конце */
export const riskSortValue = (task: ForecastTask) => openTaskForecast(task)?.riskProbability ?? -1;

export const matchesRisk = (task: ForecastTask, level: RiskLevel | "") =>
	!level || openTaskForecast(task)?.riskLevel === level;
