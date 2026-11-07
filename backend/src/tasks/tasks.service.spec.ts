import { TaskStatus } from "@prisma/client";

import { AccessService } from "../access/access.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessService } from "../projects/project-access.service";
import { TasksService } from "./tasks.service";

describe("TasksService", () => {
	const prisma = {
		task: {
			findUnique: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		},
		tag: {
			findMany: jest.fn(),
		},
		projectColumn: {
			count: jest.fn().mockResolvedValue(5),
			findFirst: jest.fn(),
		},
	};
	const projectAccess = {
		assertCanView: jest.fn(),
		isProjectMember: jest.fn(),
		isActiveProjectMember: jest.fn().mockResolvedValue(true),
	};
	const notifications = {
		notifyStatusChanged: jest.fn(),
		notifyAssignee: jest.fn(),
		notifyDeadlineChanged: jest.fn(),
	};

	const access = { assert: jest.fn() };

	const service = new TasksService(
		prisma as unknown as PrismaService,
		projectAccess as unknown as ProjectAccessService,
		notifications as unknown as NotificationsService,
		access as unknown as AccessService,
	);

	const actor = {
		id: "admin",
		email: "admin@tasko.local",
		fullName: "Админ",
		systemRole: "ADMIN" as const,
		isActive: true,
	};

	const task = {
		id: "t1",
		projectId: "p1",
		authorId: "u1",
		assigneeId: "u2",
		parentTaskId: null,
		title: "Карточка",
		description: null,
		type: "TASK",
		priority: "MEDIUM",
		status: TaskStatus.TODO,
		isCompleted: false,
		plannedStartAt: null,
		deadlineAt: null,
		actualStartAt: null,
		completedAt: null,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		author: {
			id: "u1",
			email: "a@a.a",
			fullName: "Автор",
			passwordHash: "x",
			systemRole: "MANAGER",
			isActive: true,
			createdAt: new Date("2026-01-01"),
			updatedAt: new Date("2026-01-01"),
		},
		assignee: null,
		project: { id: "p1", name: "P", status: "ACTIVE" },
		tags: [],
		coAssignees: [],
		_count: { comments: 0, subtasks: 0 },
	};

	beforeEach(() => {
		jest.clearAllMocks();
		prisma.task.findUnique.mockResolvedValue(task);
		projectAccess.isActiveProjectMember.mockResolvedValue(true);
		prisma.task.update.mockImplementation(async ({ data }) => ({ ...task, ...data }));
		prisma.projectColumn.count.mockResolvedValue(5);
		prisma.projectColumn.findFirst.mockImplementation(
			async ({ where }: { where: { status?: TaskStatus; id?: string } }) => ({
				id: `col-${where.status ?? where.id}`,
				status: where.status ?? TaskStatus.IN_PROGRESS,
			}),
		);
	});

	it("moves a task to another column with the same status without history", async () => {
		prisma.projectColumn.findFirst.mockResolvedValue({ id: "col-extra", status: TaskStatus.TODO });

		const result = await service.transition(actor, "t1", { columnId: "col-extra" });

		expect(result.columnId).toBe("col-extra");
		expect(notifications.notifyStatusChanged).not.toHaveBeenCalled();
	});

	it("takes the status from the target column", async () => {
		prisma.projectColumn.findFirst.mockResolvedValue({ id: "col-test", status: TaskStatus.REVIEW });

		const result = await service.transition(actor, "t1", { columnId: "col-test" });

		expect(result.status).toBe(TaskStatus.REVIEW);
	});

	it("moves a task from TODO straight to DONE", async () => {
		const result = await service.transition(actor, "t1", { status: TaskStatus.DONE });

		expect(result.status).toBe(TaskStatus.DONE);
	});

	it("moves a task from TODO to IN_PROGRESS and stores actualStartAt", async () => {
		const result = await service.transition(actor, "t1", { status: TaskStatus.IN_PROGRESS });

		expect(result.status).toBe(TaskStatus.IN_PROGRESS);
		expect(notifications.notifyStatusChanged).toHaveBeenCalled();
	});

	it("toggles isCompleted without changing the column status", async () => {
		const result = await service.update(actor, "t1", { isCompleted: true });

		expect(result.isCompleted).toBe(true);
		expect(prisma.task.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ isCompleted: true }),
			}),
		);
	});

	it("deletes a task that was never started", async () => {
		const result = await service.remove(actor, "t1");

		expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
		expect(result).toEqual({ success: true, cancelled: false });
	});

	it("cancels a started task instead of deleting it and keeps history", async () => {
		prisma.task.findUnique.mockResolvedValue({
			...task,
			status: TaskStatus.IN_PROGRESS,
			actualStartAt: new Date("2026-01-02"),
		});

		const result = await service.remove(actor, "t1");

		expect(prisma.task.delete).not.toHaveBeenCalled();
		expect(result).toEqual({ success: true, cancelled: true });
		expect(prisma.task.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: TaskStatus.CANCELLED,
					statusHistory: {
						create: expect.objectContaining({ fromStatus: TaskStatus.IN_PROGRESS, toStatus: TaskStatus.CANCELLED }),
					},
				}),
			}),
		);
	});

	it("treats a task closed straight from TODO as started", async () => {
		prisma.task.findUnique.mockResolvedValue({ ...task, status: TaskStatus.DONE });

		const result = await service.remove(actor, "t1");

		expect(result.cancelled).toBe(true);
		expect(prisma.task.delete).not.toHaveBeenCalled();
	});

	it("rejects a deadline earlier than the creation day", async () => {
		await expect(service.update(actor, "t1", { deadlineAt: "2025-12-25T00:00:00.000Z" })).rejects.toThrow(
			"Дедлайн не может быть раньше даты создания",
		);
	});

	it("accepts a deadline on the creation day in an earlier time zone", async () => {
		// 2026-01-01 в UTC+3 — это 2025-12-31T21:00Z, а задача создана 2026-01-01T00:00Z
		await expect(service.update(actor, "t1", { deadlineAt: "2025-12-31T21:00:00.000Z" })).resolves.toBeDefined();
	});

	it("does not assign a blocked or foreign user", async () => {
		projectAccess.isActiveProjectMember.mockResolvedValue(false);

		await expect(service.update(actor, "t1", { assigneeId: "u3" })).rejects.toThrow(
			"Исполнителем может быть только активный участник проекта",
		);
	});
});

describe("TasksService.list access", () => {
	const prisma = {
		task: { findMany: jest.fn().mockReturnValue("find"), count: jest.fn().mockReturnValue("count") },
		$transaction: jest.fn().mockResolvedValue([[], 0]),
	};
	const service = new TasksService(
		prisma as unknown as PrismaService,
		{} as unknown as ProjectAccessService,
		{} as unknown as NotificationsService,
		{} as unknown as AccessService,
	);

	const executor = {
		id: "u2",
		email: "e@tasko.local",
		fullName: "Исполнитель",
		systemRole: "EXECUTOR" as const,
		isActive: true,
	};

	beforeEach(() => jest.clearAllMocks());

	it("keeps the membership filter when a projectId is passed", async () => {
		await service.list(executor, { projectId: "p-foreign" });

		expect(prisma.task.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					projectId: "p-foreign",
					project: { members: { some: { userId: "u2" } } },
				}),
			}),
		);
	});

	it("does not restrict an administrator", async () => {
		await service.list({ ...executor, systemRole: "ADMIN" as const }, { projectId: "p1" });

		const call = prisma.task.findMany.mock.calls[0][0];
		expect(call.where.project).toBeUndefined();
	});
});
