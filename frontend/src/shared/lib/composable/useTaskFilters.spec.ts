import { describe, expect, it } from "vitest";

import { useTaskFilters } from "./useTaskFilters";

const task = (overrides: Record<string, unknown> = {}) => ({
	status: "TODO",
	type: "TASK",
	priority: "MEDIUM",
	isCompleted: false,
	assigneeId: "u1",
	deadlineAt: null,
	tags: [],
	project: { id: "p1" },
	...overrides,
});

describe("useTaskFilters", () => {
	it("counts only filters that differ from the page defaults", () => {
		const filters = useTaskFilters({ state: "open" });
		expect(filters.count.value).toBe(0);
		filters.set("priority", "HIGH");
		filters.set("state", "all");
		expect(filters.count.value).toBe(2);
	});

	it("hides closed tasks when only open ones are shown", () => {
		const filters = useTaskFilters({ state: "open" });
		expect(filters.matches(task())).toBe(true);
		expect(filters.matches(task({ status: "CANCELLED" }))).toBe(false);
		expect(filters.matches(task({ isCompleted: true }))).toBe(false);
	});

	it("combines filters and shows readable chips", () => {
		const filters = useTaskFilters({}, () => ({ users: [{ id: "u1", fullName: "Анна" }] }));
		filters.set("assigneeId", "u1");
		filters.set("priority", "HIGH");

		expect(filters.matches(task({ priority: "HIGH" }))).toBe(true);
		expect(filters.matches(task({ priority: "LOW" }))).toBe(false);
		expect(filters.chips.value.map((chip) => chip.label)).toEqual(["Приоритет: Высокий", "Исполнитель: Анна"]);
	});

	it("clears one filter or resets all back to the defaults", () => {
		const filters = useTaskFilters({ state: "open" });
		filters.set("type", "BUG");
		filters.set("risk", "HIGH");
		filters.clear("type");
		expect(filters.state.type).toBe("");
		filters.reset();
		expect(filters.state).toMatchObject({ state: "open", risk: "" });
		expect(filters.count.value).toBe(0);
	});
});
