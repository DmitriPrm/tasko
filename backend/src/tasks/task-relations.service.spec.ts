import { DependencyType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { TaskRelationsService } from "./task-relations.service";
import { TasksService } from "./tasks.service";

describe("TaskRelationsService", () => {
	const prisma = {
		task: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
		taskDependency: {
			findFirst: jest.fn(),
			findMany: jest.fn().mockResolvedValue([]),
			findUnique: jest.fn(),
			create: jest.fn(),
			delete: jest.fn(),
		},
	};
	const tasks = {
		getEditableTask: jest.fn().mockResolvedValue({ id: "t1", projectId: "p1" }),
		getViewableTask: jest.fn().mockResolvedValue({ id: "t1", projectId: "p1" }),
	};
	const service = new TaskRelationsService(prisma as unknown as PrismaService, tasks as unknown as TasksService);
	const user = { id: "u1", email: "u@tasko.local", fullName: "U", systemRole: "MANAGER" as const, isActive: true };

	beforeEach(() => {
		jest.clearAllMocks();
		prisma.task.findUnique.mockResolvedValue({ id: "t2", projectId: "p1" });
		prisma.taskDependency.findFirst.mockResolvedValue(null);
		prisma.taskDependency.findMany.mockResolvedValue([]);
	});

	it("stores 'depends on' as the other task blocking this one", async () => {
		await service.addDependency(user, "t1", { taskId: "t2", kind: "DEPENDS_ON" });

		expect(prisma.taskDependency.create).toHaveBeenCalledWith({
			data: { sourceTaskId: "t2", targetTaskId: "t1", type: DependencyType.BLOCKS, createdBy: "u1" },
		});
	});

	it("rejects linking a task to itself", async () => {
		await expect(service.addDependency(user, "t1", { taskId: "t1", kind: "BLOCKS" })).rejects.toThrow(
			"Задача не может зависеть от самой себя",
		);
	});

	it("rejects tasks from another project", async () => {
		prisma.task.findUnique.mockResolvedValue({ id: "t2", projectId: "p2" });

		await expect(service.addDependency(user, "t1", { taskId: "t2", kind: "RELATED" })).rejects.toThrow(
			"Связывать можно только задачи одного проекта",
		);
	});

	it("rejects a second link between the same tasks in any direction", async () => {
		prisma.taskDependency.findFirst.mockResolvedValue({ id: "d1" });

		await expect(service.addDependency(user, "t1", { taskId: "t2", kind: "BLOCKS" })).rejects.toThrow(
			"Эти задачи уже связаны",
		);
	});

	it("rejects a blocking link that closes a cycle", async () => {
		// t2 уже блокирует t1; теперь t1 пытается заблокировать t2
		prisma.taskDependency.findMany.mockResolvedValueOnce([{ sourceTaskId: "t2", targetTaskId: "t1" }]);

		await expect(service.addDependency(user, "t1", { taskId: "t2", kind: "BLOCKS" })).rejects.toThrow(
			"замкнёт цепочку",
		);
		expect(prisma.taskDependency.create).not.toHaveBeenCalled();
	});

	it("does not remove a link that belongs to other tasks", async () => {
		prisma.taskDependency.findUnique.mockResolvedValue({ id: "d1", sourceTaskId: "x", targetTaskId: "y" });

		await expect(service.removeDependency(user, "t1", "d1")).rejects.toThrow("Связь не найдена");
		expect(prisma.taskDependency.delete).not.toHaveBeenCalled();
	});
});
