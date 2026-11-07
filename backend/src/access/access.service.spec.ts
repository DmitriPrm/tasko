import { SystemRole } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { AccessService } from "./access.service";

describe("AccessService", () => {
	const prisma = {
		userPermission: {
			findUnique: jest.fn(),
			findMany: jest.fn(),
		},
		rolePermission: {
			findUnique: jest.fn(),
			findMany: jest.fn(),
		},
	};

	const service = new AccessService(prisma as unknown as PrismaService);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("falls back to the role default", async () => {
		prisma.userPermission.findUnique.mockResolvedValue(null);
		prisma.rolePermission.findUnique.mockResolvedValue(null);

		await expect(
			service.has(
				{ id: "a", email: "a@tasko.local", fullName: "Админ", systemRole: SystemRole.ADMIN, isActive: true },
				"SETTINGS_PERMISSIONS",
			),
		).resolves.toBe(true);
		await expect(
			service.has(
				{
					id: "e",
					email: "e@tasko.local",
					fullName: "Исполнитель",
					systemRole: SystemRole.EXECUTOR,
					isActive: true,
				},
				"SETTINGS_PERMISSIONS",
			),
		).resolves.toBe(false);
	});

	it("prefers a personal override over the role", async () => {
		prisma.userPermission.findUnique.mockResolvedValue({ enabled: false });

		await expect(
			service.has(
				{ id: "a", email: "a@tasko.local", fullName: "Админ", systemRole: SystemRole.ADMIN, isActive: true },
				"USERS_BLOCK",
			),
		).resolves.toBe(false);
		expect(prisma.rolePermission.findUnique).not.toHaveBeenCalled();
	});
});
