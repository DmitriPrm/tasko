import { TaskStatus } from "@prisma/client";

import { buildForecast } from "../tasks/forecast";
import { ClosedTask, compareDurations, plannedHours, summarizeRisks } from "./risk-analytics";

const at = (value: string) => new Date(value);

function closed(overrides: Partial<ClosedTask>): ClosedTask {
	return {
		id: "t",
		status: TaskStatus.DONE,
		createdAt: at("2026-01-01T00:00:00Z"),
		actualStartAt: at("2026-01-01T00:00:00Z"),
		completedAt: at("2026-01-02T00:00:00Z"),
		deadlineAt: null,
		plannedStartAt: null,
		predictedHours: null,
		...overrides,
	};
}

describe("risk analytics", () => {
	it("counts open tasks by level and ranks the riskiest first", () => {
		const forecast = (riskProbability: number) => ({
			...buildForecast({
				type: "TASK",
				priority: "MEDIUM",
				status: TaskStatus.TODO,
				deadlineAt: null,
				createdAt: at("2026-01-01T00:00:00Z"),
			}),
			riskProbability,
			riskLevel:
				riskProbability >= 0.7 ? ("HIGH" as const) : riskProbability >= 0.4 ? ("MEDIUM" as const) : ("LOW" as const),
		});
		const { byRisk, ranked } = summarizeRisks([
			{ task: "a", forecast: forecast(0.2) },
			{ task: "b", forecast: forecast(0.9) },
			{ task: "c", forecast: forecast(0.5) },
		]);

		expect(byRisk).toEqual({ LOW: 1, MEDIUM: 1, HIGH: 1 });
		expect(ranked.map((entry) => entry.task)).toEqual(["b", "c", "a"]);
	});

	it("plans until the end of the deadline day", () => {
		expect(plannedHours(closed({ deadlineAt: at("2026-01-02T00:00:00Z") }))).toBe(48);
		expect(plannedHours(closed({ deadlineAt: null }))).toBeNull();
	});

	it("compares forecast with fact and reports the mean absolute error", () => {
		const { rows, summary } = compareDurations([
			closed({ id: "over", predictedHours: 30 }),
			closed({ id: "under", predictedHours: 14 }),
			closed({ id: "none" }),
		]);

		expect(rows.map((row) => row.errorHours)).toEqual([6, -10, null]);
		expect(summary).toMatchObject({
			closed: 3,
			withPrediction: 2,
			maeHours: 8,
			avgActualHours: 24,
			avgPredictedHours: 22,
		});
	});
});
