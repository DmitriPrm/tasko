import { wouldCreateCycle } from "./dependency-graph";

describe("wouldCreateCycle", () => {
	const edges = [
		{ sourceTaskId: "a", targetTaskId: "b" },
		{ sourceTaskId: "b", targetTaskId: "c" },
	];

	it("rejects a task blocking itself", () => {
		expect(wouldCreateCycle([], "a", "a")).toBe(true);
	});

	it("rejects a direct back edge", () => {
		expect(wouldCreateCycle(edges, "b", "a")).toBe(true);
	});

	it("rejects an indirect cycle through several tasks", () => {
		expect(wouldCreateCycle(edges, "c", "a")).toBe(true);
	});

	it("allows edges that keep the graph acyclic", () => {
		expect(wouldCreateCycle(edges, "a", "c")).toBe(false);
		expect(wouldCreateCycle(edges, "d", "a")).toBe(false);
	});
});
