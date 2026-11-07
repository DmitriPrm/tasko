import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

import { AccessService } from "../access/access.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";

jest.mock("bcrypt", () => ({
	hash: jest.fn(),
}));

describe("UsersService", () => {
	const prisma = {
		user: {
			findUnique: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			findMany: jest.fn(),
			count: jest.fn(),
		},
		projectMember: {
			findFirst: jest.fn(),
		},
		$transaction: jest.fn(),
	};

	const access = {
		assert: jest.fn(),
		has: jest.fn().mockResolvedValue(true),
		listEffective: jest.fn().mockResolvedValue([]),
	};

	const service = new UsersService(prisma as unknown as PrismaService, access as unknown as AccessService);

	const user = {
		id: "u1",
		email: "new@tasko.local",
		fullName: "Новый Пользователь",
		passwordHash: "hashed",
		systemRole: SystemRole.EXECUTOR,
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
		prisma.user.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
			...user,
			...data,
		}));
	});

	it("creates a user with a hashed password and lowercase email", async () => {
		prisma.user.findUnique.mockResolvedValue(null);
		prisma.user.create.mockResolvedValue(user);

		const result = await service.create(user, {
			email: "New@tasko.local",
			fullName: "Новый Пользователь",
			password: "Password123!",
			systemRole: SystemRole.EXECUTOR,
		});

		expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "new@tasko.local" } });
		expect(bcrypt.hash).toHaveBeenCalledWith("Password123!", 10);
		expect(result.email).toBe(user.email);
		expect(result.initials).toBe("НП");
	});

	it("rejects a duplicate email", async () => {
		prisma.user.findUnique.mockResolvedValue(user);

		await expect(
			service.create(user, {
				email: user.email,
				fullName: user.fullName,
				password: "Password123!",
				systemRole: SystemRole.EXECUTOR,
			}),
		).rejects.toBeInstanceOf(ConflictException);
		expect(prisma.user.create).not.toHaveBeenCalled();
	});

	it("blocks an existing user", async () => {
		prisma.user.findUnique.mockResolvedValue(user);
		prisma.user.update.mockResolvedValue({ ...user, isActive: false });

		const result = await service.update(user, user.id, { isActive: false });

		expect(result.isActive).toBe(false);
		expect(prisma.user.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: user.id },
				data: expect.objectContaining({ isActive: false }),
			}),
		);
	});

	it("returns a user profile by id", async () => {
		prisma.user.findUnique.mockResolvedValue(user);

		const result = await service.getById(user, user.id);

		expect(result.id).toBe(user.id);
		expect(result.email).toBe(user.email);
	});

	it("hides users who share no project with the actor", async () => {
		prisma.user.findUnique.mockResolvedValue({ ...user, id: "u2" });
		prisma.projectMember.findFirst.mockResolvedValue(null);

		await expect(service.getById(user, "u2")).rejects.toBeInstanceOf(ForbiddenException);
	});

	it("shows users who share a project with the actor", async () => {
		prisma.user.findUnique.mockResolvedValue({ ...user, id: "u2" });
		prisma.projectMember.findFirst.mockResolvedValue({ id: "m1" });

		const result = await service.getById(user, "u2");

		expect(result.id).toBe("u2");
	});

	it("shows any user to an administrator", async () => {
		prisma.user.findUnique.mockResolvedValue({ ...user, id: "u2" });
		const admin = { ...user, id: "admin", systemRole: SystemRole.ADMIN };

		const result = await service.getById(admin, "u2");

		expect(result.id).toBe("u2");
		expect(prisma.projectMember.findFirst).not.toHaveBeenCalled();
	});

	it("allows only administrators to list all users", async () => {
		await expect(service.list(user, {})).rejects.toBeInstanceOf(ForbiddenException);
	});

	it("throws when updating a missing user", async () => {
		prisma.user.findUnique.mockResolvedValue(null);

		await expect(service.update(user, "missing", { isActive: false })).rejects.toBeInstanceOf(NotFoundException);
	});
});
