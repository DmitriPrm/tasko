import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ProjectRole, ProjectStatus, SystemRole } from "@prisma/client";

import { AccessService } from "../access/access.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessService } from "./project-access.service";
import { ProjectsService } from "./projects.service";

describe("ProjectsService favorites", () => {
	const prisma = {
		projectFavorite: {
			findMany: jest.fn(),
			upsert: jest.fn(),
			deleteMany: jest.fn(),
		},
		user: {
			findUnique: jest.fn(),
		},
		project: {
			delete: jest.fn(),
		},
		projectMember: {
			findUnique: jest.fn(),
			create: jest.fn(),
			delete: jest.fn(),
		},
		task: {
			updateMany: jest.fn(),
		},
		taskCoAssignee: {
			deleteMany: jest.fn(),
		},
		$transaction: jest.fn(),
	};
	const projectAccess = {
		assertCanView: jest.fn(),
		assertCanManage: jest.fn(),
	};

	const access = { assert: jest.fn() };

	const service = new ProjectsService(
		prisma as unknown as PrismaService,
		projectAccess as unknown as ProjectAccessService,
		access as unknown as AccessService,
	);

	const user = {
		id: "u1",
		email: "manager@tasko.local",
		fullName: "Ирина",
		systemRole: SystemRole.MANAGER,
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
		owner: {
			id: "u1",
			email: "manager@tasko.local",
			fullName: "Ирина Петрова",
			passwordHash: "x",
			systemRole: SystemRole.MANAGER,
			isActive: true,
			createdAt: new Date("2026-01-01"),
			updatedAt: new Date("2026-01-01"),
		},
		members: [],
		tags: [],
		_count: { tasks: 0, members: 1 },
	};

	beforeEach(() => {
		jest.clearAllMocks();
		projectAccess.assertCanView.mockResolvedValue(project);
		prisma.projectFavorite.findMany.mockResolvedValue([{ projectId: "p1" }]);
	});

	it("adds a project to favorites after access check", async () => {
		const result = await service.addFavorite(user, "p1");

		expect(projectAccess.assertCanView).toHaveBeenCalledWith("p1", user);
		expect(prisma.projectFavorite.upsert).toHaveBeenCalled();
		expect(result.isFavorite).toBe(true);
	});

	it("does not favorite a project the user cannot see", async () => {
		projectAccess.assertCanView.mockRejectedValue(new ForbiddenException());

		await expect(service.addFavorite(user, "p1")).rejects.toBeInstanceOf(ForbiddenException);
		expect(prisma.projectFavorite.upsert).not.toHaveBeenCalled();
	});

	it("lists only favorite projects", async () => {
		prisma.projectFavorite.findMany.mockResolvedValue([{ project }]);

		const result = await service.listFavorites(user);

		expect(result).toHaveLength(1);
		expect(result[0].isFavorite).toBe(true);
	});

	it("adds an active user to the project", async () => {
		const target = {
			...project.owner,
			id: "u2",
			email: "executor@tasko.local",
			fullName: "Исполнитель",
			systemRole: SystemRole.EXECUTOR,
			isActive: true,
		};
		projectAccess.assertCanManage.mockResolvedValue(project);
		prisma.user.findUnique.mockResolvedValue(target);
		prisma.projectMember.findUnique.mockResolvedValue(null);
		prisma.projectMember.create.mockResolvedValue({
			id: "m1",
			projectId: "p1",
			userId: "u2",
			projectRole: ProjectRole.MEMBER,
			joinedAt: new Date("2026-01-01"),
			user: target,
		});

		const result = await service.addMember(user, "p1", {
			userId: "u2",
			projectRole: ProjectRole.MEMBER,
		});

		expect(projectAccess.assertCanManage).toHaveBeenCalledWith("p1", user);
		expect(result.userId).toBe("u2");
		expect(result.projectRole).toBe(ProjectRole.MEMBER);
	});

	it("does not remove the project owner", async () => {
		projectAccess.assertCanManage.mockResolvedValue(project);

		await expect(service.removeMember(user, "p1", "u1")).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.projectMember.delete).not.toHaveBeenCalled();
	});

	it("removes a regular member and unassigns their tasks", async () => {
		projectAccess.assertCanManage.mockResolvedValue({
			...project,
			members: [{ id: "m2", userId: "u2", projectRole: ProjectRole.MEMBER }],
		});

		const result = await service.removeMember(user, "p1", "u2");

		expect(prisma.task.updateMany).toHaveBeenCalledWith({
			where: { projectId: "p1", assigneeId: "u2" },
			data: { assigneeId: null },
		});
		expect(prisma.projectMember.delete).toHaveBeenCalledWith({
			where: { projectId_userId: { projectId: "p1", userId: "u2" } },
		});
		expect(prisma.$transaction).toHaveBeenCalled();
		expect(result.success).toBe(true);
	});

	it("fails when the member does not belong to the project", async () => {
		projectAccess.assertCanManage.mockResolvedValue(project);

		await expect(service.removeMember(user, "p1", "u9")).rejects.toBeInstanceOf(NotFoundException);
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it("deletes a project after the manage check", async () => {
		const result = await service.remove(user, "p1");

		expect(projectAccess.assertCanManage).toHaveBeenCalledWith("p1", user);
		expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
		expect(result).toEqual({ success: true });
	});
});
