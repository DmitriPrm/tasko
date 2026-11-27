import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";

import { buildForecast } from "./forecast";

describe("buildForecast", () => {
	const now = new Date("2026-10-11T00:00:00.000Z");

	it("marks an overdue open task as high risk", () => {
		const forecast = buildForecast(
			{
				type: TaskType.TASK,
				priority: TaskPriority.HIGH,
				status: TaskStatus.TODO,
				deadlineAt: new Date("2026-10-01T00:00:00.000Z"),
				createdAt: new Date("2026-09-01T00:00:00.000Z"),
			},
			now,
		);

		expect(forecast.riskLevel).toBe("HIGH");
		expect(forecast.factors).toContain("OVERDUE");
		expect(forecast.durationDays).toBeGreaterThan(0);
	});

	it("keeps a finished task at low risk", () => {
		const forecast = buildForecast(
			{
				type: TaskType.BUG,
				priority: TaskPriority.LOW,
				status: TaskStatus.DONE,
				deadlineAt: new Date("2026-10-20T00:00:00.000Z"),
				createdAt: now,
			},
			now,
		);

		expect(forecast.riskLevel).toBe("LOW");
		expect(forecast.factors).toContain("FINISHED");
	});

	const openTask = {
		type: TaskType.FEATURE,
		priority: TaskPriority.MEDIUM,
		status: TaskStatus.TODO,
		deadlineAt: new Date("2026-10-20T00:00:00.000Z"),
		createdAt: now,
	};
	const prediction = {
		durationHours: 30,
		riskProbability: 0.55,
		createdAt: new Date("2026-10-10T12:00:00.000Z"),
		factors: { risk: [{ feature: "deadline_horizon_hours", label: "Время до срока", impact: 0.12 }], duration: [] },
		durationModel: { version: "duration-v1", algorithm: "ridge" },
		riskModel: { version: "risk-v1", algorithm: "random_forest" },
	};

	it("falls back to rules when there is no stored prediction", () => {
		const forecast = buildForecast(openTask, now);
		expect(forecast.source).toBe("RULES");
		expect(forecast.models).toBeNull();
	});

	it("uses the stored ML prediction for an open task", () => {
		const forecast = buildForecast({ ...openTask, predictions: [prediction] }, now);

		expect(forecast).toMatchObject({
			source: "ML",
			durationHours: 30,
			durationDays: 1,
			riskProbability: 0.55,
			riskLevel: "MEDIUM",
			calculatedAt: "2026-10-10T12:00:00.000Z",
			models: { duration: "duration-v1", risk: "risk-v1" },
		});
		expect(forecast.riskFactors[0].label).toBe("Время до срока");
	});

	it("does not let the model hide a deadline that has already passed", () => {
		const forecast = buildForecast(
			{
				...openTask,
				deadlineAt: new Date("2026-10-01T00:00:00.000Z"),
				predictions: [{ ...prediction, riskProbability: 0.1 }],
			},
			now,
		);
		expect(forecast.source).toBe("ML");
		expect(forecast.factors).toContain("OVERDUE");
		expect(forecast.riskLevel).toBe("HIGH");
	});

	it("ignores an old prediction once the task is finished", () => {
		const forecast = buildForecast({ ...openTask, status: TaskStatus.DONE, predictions: [prediction] }, now);
		expect(forecast.source).toBe("RULES");
		expect(forecast.factors).toContain("FINISHED");
	});
});
