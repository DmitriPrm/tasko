import { NotificationType, TaskStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { SystemSettingsService } from "../system-settings/system-settings.service";
import { DeadlineRemindersService } from "./deadline-reminders.service";

describe("DeadlineRemindersService", () => {
	const prisma = {
		task: { findMany: jest.fn() },
		notification: { createMany: jest.fn() },
	};
	const settings = { section: jest.fn() };
	const service = new DeadlineRemindersService(
		prisma as unknown as PrismaService,
		settings as unknown as SystemSettingsService,
	);
	const now = new Date("2026-11-10T09:00:00Z");

	beforeEach(() => {
		jest.clearAllMocks();
		settings.section.mockReturnValue({ reminderHours: 24 });
	});

	it("looks only at open tasks due within the window", async () => {
		prisma.task.findMany.mockResolvedValue([]);

		await service.sendReminders(now);

		const where = prisma.task.findMany.mock.calls[0][0].where;
		expect(where.deadlineAt).toEqual({ gte: now, lte: new Date("2026-11-11T09:00:00Z") });
		expect(where.status).toEqual({ notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] });
		expect(where.isCompleted).toBe(false);
	});

	it("reminds the assignee and co-assignees once each", async () => {
		prisma.task.findMany.mockResolvedValue([
			{
				id: "t1",
				title: "Отчёт",
				deadlineAt: new Date("2026-11-10T18:00:00Z"),
				assigneeId: "u1",
				coAssignees: [{ userId: "u2" }, { userId: "u1" }],
				notifications: [{ userId: "u2" }],
			},
		]);

		const created = await service.sendReminders(now);

		expect(created).toBe(1);
		expect(prisma.notification.createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({ userId: "u1", type: NotificationType.DEADLINE_APPROACHING, relatedTaskId: "t1" }),
			],
		});
	});

	it("skips tasks without anyone to notify", async () => {
		prisma.task.findMany.mockResolvedValue([
			{ id: "t2", title: "Без исполнителя", deadlineAt: now, assigneeId: null, coAssignees: [], notifications: [] },
		]);

		expect(await service.sendReminders(now)).toBe(0);
		expect(prisma.notification.createMany).not.toHaveBeenCalled();
	});

	it("respects the reminder window from the system settings", async () => {
		settings.section.mockReturnValue({ reminderHours: 48 });
		prisma.task.findMany.mockResolvedValue([]);

		await service.sendReminders(now);

		expect(prisma.task.findMany.mock.calls[0][0].where.deadlineAt.lte).toEqual(new Date("2026-11-12T09:00:00Z"));
	});
});
