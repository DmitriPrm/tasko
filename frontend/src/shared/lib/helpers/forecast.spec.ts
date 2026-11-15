import { describe, expect, it } from "vitest";

import type { TaskForecast } from "@/shared/api/v0/schemas";

import { matchesRisk, openTaskForecast, riskSortValue } from "./forecast";

const forecast = (riskProbability: number, riskLevel: TaskForecast["riskLevel"]): TaskForecast => ({
	source: "RULES",
	durationDays: 1,
	durationHours: 24,
	riskProbability,
	riskLevel,
	calculatedAt: "2026-11-15T00:00:00.000Z",
	inputs: [],
	factors: [],
	riskFactors: [],
	durationFactors: [],
	models: null,
});

describe("risk helpers", () => {
	const high = { status: "TODO", forecast: forecast(0.9, "HIGH") };
	const low = { status: "IN_PROGRESS", forecast: forecast(0.1, "LOW") };
	const done = { status: "DONE", forecast: forecast(0.95, "HIGH") };

	it("ignores the forecast of a finished task", () => {
		expect(openTaskForecast(done)).toBeNull();
		expect(openTaskForecast({ ...high, isCompleted: true })).toBeNull();
		expect(matchesRisk(done, "HIGH")).toBe(false);
	});

	it("filters by level and keeps everything without a filter", () => {
		expect([high, low, done].filter((task) => matchesRisk(task, "HIGH"))).toEqual([high]);
		expect([high, low, done].filter((task) => matchesRisk(task, ""))).toHaveLength(3);
	});

	it("sorts the riskiest open tasks first and finished ones last", () => {
		const sorted = [low, done, high].sort((a, b) => riskSortValue(b) - riskSortValue(a));
		expect(sorted).toEqual([high, low, done]);
	});
});
