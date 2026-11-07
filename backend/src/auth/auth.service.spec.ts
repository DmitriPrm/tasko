import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { SystemRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

import { AccessService } from "../access/access.service";
import { InvitationsService } from "../invitations/invitations.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

jest.mock("bcrypt", () => ({
	compare: jest.fn(),
	hash: jest.fn().mockResolvedValue("hashed"),
}));

jest.mock("../common/avatar/files", () => ({
	saveGeneratedAvatar: jest.fn().mockReturnValue("avatar.svg"),
	publicAvatarUrl: jest.fn().mockReturnValue(null),
}));

describe("AuthService", () => {
	const prisma = {
		user: {
			findUnique: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
		},
		emailVerificationToken: {
			findUnique: jest.fn(),
			create: jest.fn(),
			deleteMany: jest.fn(),
		},
		$transaction: jest.fn().mockResolvedValue([]),
	};
	const mail = { send: jest.fn().mockResolvedValue(true) };
	const invitations = {
		findActiveByToken: jest.fn(),
		acceptForUser: jest.fn().mockResolvedValue({ success: true, projectId: "p1" }),
	};
	const jwtService = {
		sign: jest.fn().mockReturnValue("token"),
		verifyAsync: jest.fn(),
	};
	const configService = {
		getOrThrow: jest.fn().mockReturnValue("secret"),
		get: jest.fn().mockReturnValue("2h"),
	};

	const access = {
		listEffective: jest.fn().mockResolvedValue(["PROFILE_EDIT_OWN"]),
	};

	const service = new AuthService(
		prisma as unknown as PrismaService,
		jwtService as unknown as JwtService,
		configService as unknown as ConfigService,
		access as unknown as AccessService,
		mail as unknown as MailService,
		invitations as unknown as InvitationsService,
	);

	const user = {
		id: "u1",
		email: "manager@tasko.local",
		fullName: "Ирина Петрова",
		passwordHash: "hash",
		systemRole: SystemRole.MANAGER,
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		jwtService.sign.mockReturnValue("token");
		mail.send.mockResolvedValue(true);
		prisma.$transaction.mockResolvedValue([]);
		prisma.user.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
			...user,
			id: "u9",
			email: "new@tasko.local",
			fullName: "Новый Человек",
			...data,
		}));
		prisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
			...user,
			id: "u9",
			...data,
		}));
	});

	const registerDto = {
		fullName: "Новый Человек",
		email: "new@tasko.local",
		password: "Password123!",
	};

	it("registers an executor and sends a verification email", async () => {
		prisma.user.findUnique.mockResolvedValue(null);
		invitations.findActiveByToken.mockResolvedValue(null);

		const result = await service.register(registerDto);

		expect(prisma.user.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				email: "new@tasko.local",
				systemRole: SystemRole.EXECUTOR,
				emailVerifiedAt: null,
			}),
		});
		expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: "new@tasko.local" }));
		expect(result.verificationSent).toBe(true);
		expect(result.accessToken).toBe("token");
	});

	it("rejects registration with an email that is already taken", async () => {
		prisma.user.findUnique.mockResolvedValue(user);

		await expect(service.register(registerDto)).rejects.toBeInstanceOf(ConflictException);
		expect(prisma.user.create).not.toHaveBeenCalled();
	});

	it("verifies the email and joins the project when registering from an invitation", async () => {
		prisma.user.findUnique.mockResolvedValue(null);
		invitations.findActiveByToken.mockResolvedValue({ id: "i1", email: "new@tasko.local" });

		const result = await service.register({ ...registerDto, inviteToken: "token-from-email" });

		expect(prisma.user.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
		});
		expect(invitations.acceptForUser).toHaveBeenCalledWith({ id: "i1", email: "new@tasko.local" }, "u9");
		expect(mail.send).not.toHaveBeenCalled();
		expect(result.joinedProjectId).toBe("p1");
	});

	it("does not trust an invitation sent to another address", async () => {
		prisma.user.findUnique.mockResolvedValue(null);
		invitations.findActiveByToken.mockResolvedValue({ id: "i1", email: "other@tasko.local" });

		await service.register({ ...registerDto, inviteToken: "token-from-email" });

		expect(prisma.user.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ emailVerifiedAt: null }),
		});
		expect(invitations.acceptForUser).not.toHaveBeenCalled();
		expect(mail.send).toHaveBeenCalled();
	});

	it("rejects an expired verification link", async () => {
		prisma.emailVerificationToken.findUnique.mockResolvedValue({
			userId: "u1",
			expiresAt: new Date(Date.now() - 1000),
		});

		await expect(service.verifyEmail("a".repeat(40))).rejects.toBeInstanceOf(BadRequestException);
	});

	it("confirms the email with a valid link", async () => {
		prisma.emailVerificationToken.findUnique.mockResolvedValue({
			userId: "u1",
			expiresAt: new Date(Date.now() + 60_000),
		});

		const result = await service.verifyEmail("a".repeat(40));

		expect(result).toEqual({ success: true });
		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { id: "u1" },
			data: { emailVerifiedAt: expect.any(Date) },
		});
	});

	it("logs in an active user with a valid password", async () => {
		prisma.user.findUnique.mockResolvedValue(user);
		(bcrypt.compare as jest.Mock).mockResolvedValue(true);

		const result = await service.login({ email: "Manager@tasko.local", password: "Password123!" });

		expect(prisma.user.findUnique).toHaveBeenCalledWith({
			where: { email: "manager@tasko.local" },
		});
		expect(result.accessToken).toBe("token");
		expect(result.user.email).toBe(user.email);
		expect(result.user.initials).toBe("ИП");
	});

	it("rejects a wrong password", async () => {
		prisma.user.findUnique.mockResolvedValue(user);
		(bcrypt.compare as jest.Mock).mockResolvedValue(false);

		await expect(service.login({ email: user.email, password: "bad" })).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
	});

	it("rejects a blocked user", async () => {
		prisma.user.findUnique.mockResolvedValue({ ...user, isActive: false });

		await expect(service.login({ email: user.email, password: "Password123!" })).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
	});

	it("returns a full user dto for the current session", async () => {
		prisma.user.findUnique.mockResolvedValue(user);

		const result = await service.me({
			id: user.id,
			email: user.email,
			fullName: user.fullName,
			systemRole: user.systemRole,
			isActive: true,
		});

		expect(result.initials).toBe("ИП");
		expect(result.avatarColor).toBeDefined();
		expect(result.createdAt).toBe(user.createdAt.toISOString());
		expect(result.updatedAt).toBe(user.updatedAt.toISOString());
	});
});
