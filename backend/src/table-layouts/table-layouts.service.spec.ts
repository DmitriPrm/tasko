import { BadRequestException } from "@nestjs/common";
import { SystemRole } from "@prisma/client";

import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { TableLayoutsService } from "./table-layouts.service";

describe("TableLayoutsService", () => {
	const prisma = {
		userTableLayout: {
			findUnique: jest.fn(),
			upsert: jest.fn(),
		},
	};

	const service = new TableLayoutsService(prisma as unknown as PrismaService);

	const user: AuthUser = {
		id: "user-1",
		email: "a@tasko.local",
		fullName: "Админ",
		systemRole: SystemRole.ADMIN,
		isActive: true,
	};

	const other: AuthUser = {
		...user,
		id: "user-2",
		email: "b@tasko.local",
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("returns an empty layout when the user has no saved widths", async () => {
		prisma.userTableLayout.findUnique.mockResolvedValue(null);

		await expect(service.get(user, "users")).resolves.toEqual({ code: "users", widths: {} });
		expect(prisma.userTableLayout.findUnique).toHaveBeenCalledWith({
			where: { userId_code: { userId: user.id, code: "users" } },
			select: { widths: true },
		});
	});

	it("reads only the current user's layout", async () => {
		prisma.userTableLayout.findUnique.mockResolvedValue({ widths: { fullName: 240, email: 180 } });

		await expect(service.get(other, "users")).resolves.toEqual({
			code: "users",
			widths: { fullName: 240, email: 180 },
		});
		expect(prisma.userTableLayout.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId_code: { userId: other.id, code: "users" } },
			}),
		);
	});

	it("drops stored widths that are no longer valid", async () => {
		prisma.userTableLayout.findUnique.mockResolvedValue({
			widths: { fullName: 240, "../x": 100, email: 10 },
		});

		await expect(service.get(user, "users")).resolves.toEqual({
			code: "users",
			widths: { fullName: 240 },
		});
	});

	it("saves widths for the current user and table code", async () => {
		prisma.userTableLayout.upsert.mockResolvedValue({});

		await expect(service.save(user, "project-members", { name: 220, actions: 72 })).resolves.toEqual({
			code: "project-members",
			widths: { name: 220, actions: 72 },
		});
		expect(prisma.userTableLayout.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId_code: { userId: user.id, code: "project-members" } },
				create: expect.objectContaining({ userId: user.id, code: "project-members" }),
			}),
		);
	});

	it("rejects a path-like table code before writing", async () => {
		await expect(service.save(user, "../users", { name: 120 })).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.userTableLayout.upsert).not.toHaveBeenCalled();
	});

	it("rejects a width outside the allowed range", async () => {
		await expect(service.save(user, "tasks", { title: 0 })).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.save(user, "tasks", { title: 5000 })).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.userTableLayout.upsert).not.toHaveBeenCalled();
	});
});
