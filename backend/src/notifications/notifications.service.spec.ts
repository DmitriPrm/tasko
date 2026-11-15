import { ConfigService } from "@nestjs/config";
import { NotificationType } from "@prisma/client";

import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService.deliver", () => {
	const prisma = {
		user: { findMany: jest.fn() },
		notification: { createMany: jest.fn() },
	};
	const mail = { send: jest.fn().mockResolvedValue(true) };
	const config = { get: jest.fn().mockReturnValue("http://localhost:8080") };
	const service = new NotificationsService(
		prisma as unknown as PrismaService,
		mail as unknown as MailService,
		config as unknown as ConfigService,
	);

	const draft = (userId: string) => ({
		userId,
		type: NotificationType.STATUS_CHANGED,
		title: "Изменён статус задачи",
		body: "Задача «Отчёт»: В работе → Готово",
		relatedTaskId: "t1",
	});

	beforeEach(() => jest.clearAllMocks());

	it("follows each person's preferences: muted in the app, sent by email", async () => {
		prisma.user.findMany.mockResolvedValue([
			{ id: "default", email: "d@tasko.local", preferences: null },
			{
				id: "quiet",
				email: "q@tasko.local",
				preferences: { notifications: { STATUS_CHANGED: { inApp: false, email: true } } },
			},
		]);

		const shown = await service.deliver([draft("default"), draft("quiet")]);

		expect(shown).toBe(1);
		const rows = prisma.notification.createMany.mock.calls[0][0].data;
		expect(rows).toEqual([
			expect.objectContaining({ userId: "default", muted: false, isRead: false }),
			expect.objectContaining({ userId: "quiet", muted: true, isRead: true }),
		]);
		expect(mail.send).toHaveBeenCalledTimes(1);
		expect(mail.send).toHaveBeenCalledWith(
			expect.objectContaining({ to: "q@tasko.local", subject: "TASKO: Изменён статус задачи" }),
		);
	});

	it("skips blocked users and does nothing without recipients", async () => {
		prisma.user.findMany.mockResolvedValue([]);
		await expect(service.deliver([draft("blocked")])).resolves.toBe(0);
		await expect(service.deliver([])).resolves.toBe(0);
		expect(prisma.notification.createMany).not.toHaveBeenCalled();
	});
});
