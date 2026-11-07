import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ProjectRole, ProjectStatus, SystemRole } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessService } from "./project-access.service";

describe("ProjectAccessService", () => {
	const prisma = {
		project: {
			findUnique: jest.fn(),
		},
		projectMember: {
			findUnique: jest.fn(),
		},
	};

	const service = new ProjectAccessService(prisma as unknown as PrismaService);

	const owner = {
		id: "u1",
		email: "manager@tasko.local",
		fullName: "Ирина Петрова",
		systemRole: SystemRole.MANAGER,
		isActive: true,
	};

	const member = {
		id: "u2",
		email: "executor@tasko.local",
		fullName: "Исполнитель",
		systemRole: SystemRole.EXECUTOR,
		isActive: true,
	};

	const admin = {
		id: "admin",
		email: "admin@tasko.local",
		fullName: "Админ",
		systemRole: SystemRole.ADMIN,
		isActive: true,
	};

	const project = {
		id: "p1",
		name: "TASKO",
		description: null,
		status: ProjectStatus.ACTIVE,
		ownerId: "u1",
		plannedStartAt: null,
		plannedEndAt: null,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		owner,
		members: [
			{ userId: "u1", projectRole: ProjectRole.MANAGER, user: owner },
			{ userId: "u2", projectRole: ProjectRole.MEMBER, user: member },
		],
		tags: [],
		_count: { tasks: 0, members: 2 },
	};

	beforeEach(() => {
		jest.clearAllMocks();
		prisma.project.findUnique.mockResolvedValue(project);
	});

	it("lets an admin view any project", async () => {
		const result = await service.assertCanView("p1", admin);

		expect(result.id).toBe("p1");
		expect(prisma.project.findUnique).toHaveBeenCalled();
	});

	it("lets a project member view the project", async () => {
		const result = await service.assertCanView("p1", member);

		expect(result.id).toBe("p1");
	});

	it("forbids a user who is not a member", async () => {
		await expect(
			service.assertCanView("p1", { ...member, id: "stranger" }),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it("throws when the project is missing", async () => {
		prisma.project.findUnique.mockResolvedValue(null);

		await expect(service.assertCanView("missing", admin)).rejects.toBeInstanceOf(NotFoundException);
	});

	it("lets a project manager manage the project", async () => {
		const result = await service.assertCanManage("p1", owner);

		expect(result.id).toBe("p1");
	});

	it("forbids a regular member from managing the project", async () => {
		await expect(service.assertCanManage("p1", member)).rejects.toBeInstanceOf(ForbiddenException);
	});
});
