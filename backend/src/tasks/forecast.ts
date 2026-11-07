import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface ForecastInput {
	type: TaskType;
	priority: TaskPriority;
	status: TaskStatus;
	deadlineAt: Date | null;
	createdAt: Date;
}

export interface TaskForecast {
	durationDays: number;
	riskProbability: number;
	riskLevel: RiskLevel;
	calculatedAt: string;
	inputs: { code: string; value: string }[];
	factors: string[];
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

function levelOf(probability: number): RiskLevel {
	if (probability >= 0.7) return "HIGH";
	if (probability >= 0.4) return "MEDIUM";
	return "LOW";
}

export function buildForecast(task: ForecastInput, now = new Date()): TaskForecast {
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
		durationDays,
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
	};
}
