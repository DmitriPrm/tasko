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
});
