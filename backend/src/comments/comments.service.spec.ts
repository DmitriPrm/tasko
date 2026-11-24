import { NotFoundException } from "@nestjs/common";
import { SystemRole } from "@prisma/client";

import { AccessService } from "../access/access.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessService } from "../projects/project-access.service";
import { CommentsService } from "./comments.service";

describe("CommentsService", () => {
	const prisma = {
		task: {
			findUnique: jest.fn(),
		},
		comment: {
			findMany: jest.fn(),
			create: jest.fn(),
			findUnique: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		},
	};
	const projectAccess = {
		assertCanView: jest.fn(),
	};

	const access = { assert: jest.fn() };

	const service = new CommentsService(
		prisma as unknown as PrismaService,
		projectAccess as unknown as ProjectAccessService,
		access as unknown as AccessService,
	);

	const user = {
		id: "u1",
		email: "manager@tasko.local",
		fullName: "Ирина Петрова",
		systemRole: SystemRole.MANAGER,
		isActive: true,
	};

	const author = {
		id: "u1",
		email: "manager@tasko.local",
		fullName: "Ирина Петрова",
		passwordHash: "x",
		systemRole: SystemRole.MANAGER,
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
	};

	const task = {
		id: "t1",
		projectId: "p1",
	};

	beforeEach(() => {
		jest.clearAllMocks();
		prisma.task.findUnique.mockResolvedValue(task);
		projectAccess.assertCanView.mockResolvedValue({});
	});

	it("creates a comment after checking project access", async () => {
		prisma.comment.create.mockResolvedValue({
			id: "c1",
			taskId: "t1",
			authorId: user.id,
			body: "Готово к проверке",
			createdAt: new Date("2026-01-01"),
			updatedAt: new Date("2026-01-01"),
			author,
		});

		const result = await service.create(user, "t1", { body: "Готово к проверке" });

		expect(projectAccess.assertCanView).toHaveBeenCalledWith("p1", user);
		expect(prisma.comment.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { taskId: "t1", authorId: user.id, body: "Готово к проверке" },
			}),
		);
		expect(result.body).toBe("Готово к проверке");
		expect(result.author.fullName).toBe(author.fullName);
	});

	it("does not create a comment for a missing task", async () => {
		prisma.task.findUnique.mockResolvedValue(null);

		await expect(service.create(user, "missing", { body: "Нет" })).rejects.toBeInstanceOf(NotFoundException);
		expect(projectAccess.assertCanView).not.toHaveBeenCalled();
		expect(prisma.comment.create).not.toHaveBeenCalled();
	});

	it("lists comments only after access check", async () => {
		prisma.comment.findMany.mockResolvedValue([]);

		await service.list(user, "t1");

		expect(projectAccess.assertCanView).toHaveBeenCalledWith("p1", user);
		expect(prisma.comment.findMany).toHaveBeenCalled();
	});

	describe("editing and deleting", () => {
		const own = { id: "c1", taskId: "t1", authorId: "u1", body: "Текст", createdAt: new Date(), updatedAt: new Date() };
		const foreign = { ...own, id: "c2", authorId: "u2" };
		const project = (role: "MANAGER" | "MEMBER") => ({ members: [{ userId: "u1", projectRole: role }] });
		const executor = { ...user, systemRole: SystemRole.EXECUTOR };

		beforeEach(() => {
			jest.clearAllMocks();
			prisma.task.findUnique.mockResolvedValue({ id: "t1", projectId: "p1" });
			prisma.comment.update.mockImplementation(async ({ data }) => ({ ...own, ...data, author }));
		});

		it("lets the author fix the text", async () => {
			projectAccess.assertCanView.mockResolvedValue(project("MEMBER"));
			prisma.comment.findUnique.mockResolvedValue(own);
			await expect(service.update(executor, "t1", "c1", { body: "Исправлено" })).resolves.toMatchObject({
				body: "Исправлено",
				canEdit: true,
			});
		});

		it("does not let anyone else edit, even a project manager", async () => {
			projectAccess.assertCanView.mockResolvedValue(project("MANAGER"));
			prisma.comment.findUnique.mockResolvedValue(foreign);
			await expect(service.update(user, "t1", "c2", { body: "Чужое" })).rejects.toThrow("только его автор");
		});

		it("lets a project manager delete someone else's comment, but not a regular member", async () => {
			prisma.comment.findUnique.mockResolvedValue(foreign);

			projectAccess.assertCanView.mockResolvedValue(project("MEMBER"));
			await expect(service.remove(executor, "t1", "c2")).rejects.toThrow("автор или руководитель");

			projectAccess.assertCanView.mockResolvedValue(project("MANAGER"));
			await expect(service.remove(executor, "t1", "c2")).resolves.toEqual({ success: true });
		});

		it("does not touch a comment from another task", async () => {
			projectAccess.assertCanView.mockResolvedValue(project("MANAGER"));
			prisma.comment.findUnique.mockResolvedValue({ ...own, taskId: "other" });
			await expect(service.remove(user, "t1", "c1")).rejects.toThrow("Комментарий не найден");
		});
	});
});
