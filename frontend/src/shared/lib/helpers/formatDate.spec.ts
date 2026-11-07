import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { isOverdue, isTaskOverdue, toIsoDate } from "./formatDate";

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
