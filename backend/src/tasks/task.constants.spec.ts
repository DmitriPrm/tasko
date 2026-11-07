import { TaskStatus } from "@prisma/client";

import { TASK_TRANSITIONS } from "./task.constants";

describe("TASK_TRANSITIONS", () => {
	it("allows a move from any status to any other status", () => {
		for (const from of Object.values(TaskStatus)) {
			const allowed = TASK_TRANSITIONS[from];
			expect(allowed).not.toContain(from);
			expect(allowed).toHaveLength(Object.values(TaskStatus).length - 1);
		}
	});

	it("allows jumping from TODO to DONE", () => {
		expect(TASK_TRANSITIONS[TaskStatus.TODO]).toContain(TaskStatus.DONE);
	});
});
