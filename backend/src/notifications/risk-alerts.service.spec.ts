import { TaskStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { SystemSettingsService } from "../system-settings/system-settings.service";
import { NotificationsService } from "./notifications.service";
import { RiskAlertsService } from "./risk-alerts.service";

describe("RiskAlertsService", () => {
	const now = new Date("2026-11-10T00:00:00Z");
	const base = {
		id: "t1",
		title: "Отчёт",
		type: "TASK",
		priority: "HIGH",
		status: TaskStatus.IN_PROGRESS,
		createdAt: new Date("2026-11-01T00:00:00Z"),
		assigneeId: "exec",
		coAssignees: [{ userId: "co" }],
		project: { members: [{ userId: "manager" }] },
		notifications: [] as { userId: string }[],
		predictions: [] as unknown[],
	};

	const prisma = {
		task: { findMany: jest.fn() },
		notification: { createMany: jest.fn() },
	};
	const settings = { section: jest.fn() };
	// Доставка с учётом личных настроек проверяется отдельно; здесь она просто пишет в базу
	const notifications = {
		deliver: jest.fn(async (data: unknown[]) => prisma.notification.createMany({ data })),
	};
	const service = new RiskAlertsService(
		prisma as unknown as PrismaService,
		settings as unknown as SystemSettingsService,
		notifications as unknown as NotificationsService,
	);

	beforeEach(() => {
		jest.clearAllMocks();
		settings.section.mockReturnValue({ alertsEnabled: true, alertManagers: true });
	});

	it("notifies the assignee, co-assignees and managers about a high risk", async () => {
		// Срок прошёл, задача открыта — правила дают высокий риск
		prisma.task.findMany.mockResolvedValue([{ ...base, deadlineAt: new Date("2026-11-05T00:00:00Z") }]);

		const created = await service.notify({}, now);

		expect(created).toBe(3);
		const data = prisma.notification.createMany.mock.calls[0][0].data;
		expect(data.map((item: { userId: string }) => item.userId).sort()).toEqual(["co", "exec", "manager"]);
		expect(data[0]).toMatchObject({ type: "HIGH_RISK", relatedTaskId: "t1" });
	});

	it("does not repeat a notification the person already got", async () => {
		prisma.task.findMany.mockResolvedValue([
			{
				...base,
				deadlineAt: new Date("2026-11-05T00:00:00Z"),
				notifications: [{ userId: "exec" }, { userId: "co" }, { userId: "manager" }],
			},
		]);
		await expect(service.notify({}, now)).resolves.toBe(0);
		expect(prisma.notification.createMany).not.toHaveBeenCalled();
	});

	it("stays quiet when the risk is not high", async () => {
		prisma.task.findMany.mockResolvedValue([
			{ ...base, priority: "LOW", status: TaskStatus.IN_PROGRESS, deadlineAt: new Date("2026-12-20T00:00:00Z") },
		]);
		await expect(service.notify({}, now)).resolves.toBe(0);
	});

	it("skips managers or everything when the administrator turned it off", async () => {
		prisma.task.findMany.mockResolvedValue([{ ...base, deadlineAt: new Date("2026-11-05T00:00:00Z") }]);

		settings.section.mockReturnValue({ alertsEnabled: true, alertManagers: false });
		await expect(service.notify({}, now)).resolves.toBe(2);

		settings.section.mockReturnValue({ alertsEnabled: false, alertManagers: true });
		await expect(service.notify({}, now)).resolves.toBe(0);
	});
});
