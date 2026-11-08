import { TaskStatus } from "@prisma/client";

import { buildPredictionInput, deadlineMissed, durationHours, HistoryTask, historyStats } from "./prediction-input";

const at = (value: string) => new Date(value);

function done(id: string, start: string, end: string, deadline: string | null = null): HistoryTask {
	return {
		id,
		status: TaskStatus.DONE,
		createdAt: at(start),
		actualStartAt: at(start),
		completedAt: at(end),
		deadlineAt: deadline ? at(deadline) : null,
	};
}

describe("prediction input", () => {
	const moment = at("2026-02-01T00:00:00Z");

	it("counts work time from the first move to In progress when actualStartAt is empty", () => {
		const task = {
			...done("a", "2026-01-01T00:00:00Z", "2026-01-01T10:00:00Z"),
			actualStartAt: null,
			firstProgressAt: at("2026-01-01T04:00:00Z"),
		};
		expect(durationHours(task)).toBe(6);
	});

	it("treats closing on the deadline day as on time, like the training code", () => {
		expect(deadlineMissed(done("a", "2026-01-01T00:00:00Z", "2026-01-02T18:00:00Z", "2026-01-02T00:00:00Z"))).toBe(
			false,
		);
		expect(deadlineMissed(done("b", "2026-01-01T00:00:00Z", "2026-01-03T01:00:00Z", "2026-01-02T00:00:00Z"))).toBe(
			true,
		);
	});

	it("uses only tasks finished before the moment and skips the task itself", () => {
		const history: HistoryTask[] = [
			done("old", "2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z", "2026-01-01T00:00:00Z"),
			done("later", "2026-01-10T00:00:00Z", "2026-03-01T00:00:00Z"),
			{
				id: "self",
				status: TaskStatus.TODO,
				createdAt: at("2026-01-20T00:00:00Z"),
				actualStartAt: null,
				completedAt: null,
				deadlineAt: null,
			},
			{
				id: "cancelled",
				status: TaskStatus.CANCELLED,
				createdAt: at("2026-01-05T00:00:00Z"),
				actualStartAt: null,
				completedAt: null,
				deadlineAt: null,
				cancelledAt: at("2026-01-06T00:00:00Z"),
			},
		];

		expect(historyStats(history, moment, "self")).toEqual({ done: 1, active: 1, avgDuration: 24, overdueRate: 1 });
	});

	it("builds the payload the ML service expects without names or emails", () => {
		const input = buildPredictionInput(
			{
				id: "t1",
				type: "BUG",
				priority: "HIGH",
				title: "Падает вход",
				description: null,
				deadlineAt: at("2026-02-03T00:00:00Z"),
				plannedStartAt: null,
				parentTaskId: "p",
				assigneeId: "u1",
				tagsCount: 2,
				openBlockersCount: 1,
			},
			[done("old", "2026-01-01T00:00:00Z", "2026-01-01T08:00:00Z")],
			[],
			moment,
		);

		expect(input).toMatchObject({
			type: "BUG",
			created_at: "2026-02-01T00:00:00.000Z",
			deadline_at: "2026-02-03T00:00:00.000Z",
			description: "",
			is_subtask: true,
			blocked_by_count: 1,
			has_assignee: true,
			assignee_done_count: 1,
			assignee_avg_duration_hours: 8,
			project_done_count: 0,
			project_avg_duration_hours: null,
		});
		expect(Object.keys(input)).not.toContain("assignee_id");
	});

	it("marks a task without an assignee", () => {
		const input = buildPredictionInput(
			{
				id: "t1",
				type: "TASK",
				priority: "LOW",
				title: "t",
				description: "d",
				deadlineAt: null,
				plannedStartAt: null,
				parentTaskId: null,
				assigneeId: null,
				tagsCount: 0,
				openBlockersCount: 0,
			},
			null,
			[],
			moment,
		);
		expect(input).toMatchObject({ has_assignee: false, assignee_done_count: 0, assignee_overdue_rate: null });
	});
});
