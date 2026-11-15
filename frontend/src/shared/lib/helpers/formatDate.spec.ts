import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { isOverdue, isTaskOverdue, matchesDeadline, toIsoDate } from "./formatDate";

const yesterday = dayjs().subtract(1, "day").toISOString();
const tomorrow = dayjs().add(1, "day").toISOString();

describe("isOverdue", () => {
	it("treats a past day as overdue", () => {
		expect(isOverdue(yesterday)).toBe(true);
	});

	it("does not treat today as overdue", () => {
		expect(isOverdue(dayjs().startOf("day").toISOString())).toBe(false);
	});

	it("ignores an empty date", () => {
		expect(isOverdue(null)).toBe(false);
	});
});

describe("isTaskOverdue", () => {
	it("flags an open task with a past deadline", () => {
		expect(isTaskOverdue({ deadlineAt: yesterday, status: "IN_PROGRESS" })).toBe(true);
	});

	it("never flags finished, cancelled or completed tasks", () => {
		expect(isTaskOverdue({ deadlineAt: yesterday, status: "DONE" })).toBe(false);
		expect(isTaskOverdue({ deadlineAt: yesterday, status: "CANCELLED" })).toBe(false);
		expect(isTaskOverdue({ deadlineAt: yesterday, status: "TODO", isCompleted: true })).toBe(false);
	});

	it("does not flag a future deadline", () => {
		expect(isTaskOverdue({ deadlineAt: tomorrow, status: "TODO" })).toBe(false);
	});
});

describe("toIsoDate", () => {
	it("keeps the picked calendar day in the local time zone", () => {
		const iso = toIsoDate("2026-11-20");
		expect(iso).not.toBeNull();
		expect(dayjs(iso).format("YYYY-MM-DD")).toBe("2026-11-20");
	});

	it("returns null for an empty value", () => {
		expect(toIsoDate("")).toBeNull();
	});
});

describe("matchesDeadline", () => {
	const now = dayjs("2026-11-16T12:00:00");
	const on = (date: string) => ({ deadlineAt: dayjs(date).toISOString() });

	it("keeps everything without a filter", () => {
		expect(matchesDeadline({ deadlineAt: null }, "", now)).toBe(true);
	});

	it("finds tasks due today and in the next 7 days", () => {
		expect(matchesDeadline(on("2026-11-16"), "today", now)).toBe(true);
		expect(matchesDeadline(on("2026-11-17"), "today", now)).toBe(false);
		expect(matchesDeadline(on("2026-11-23"), "week", now)).toBe(true);
		expect(matchesDeadline(on("2026-11-24"), "week", now)).toBe(false);
		expect(matchesDeadline(on("2026-11-15"), "week", now)).toBe(false);
	});

	it("finds tasks without a deadline", () => {
		expect(matchesDeadline({ deadlineAt: null }, "none", now)).toBe(true);
		expect(matchesDeadline(on("2026-11-16"), "none", now)).toBe(false);
	});
});
