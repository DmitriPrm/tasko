import { PrismaService } from "../prisma/prisma.service";
import { TasksService } from "../tasks/tasks.service";
import * as storage from "./attachment-storage";
import { AttachmentsService } from "./attachments.service";

jest.mock("./attachment-storage", () => ({
	...jest.requireActual("./attachment-storage"),
	saveAttachmentFile: jest.fn().mockReturnValue("t1/file.pdf"),
	removeAttachmentFile: jest.fn(),
}));

describe("normalizeFileName", () => {
	const { normalizeFileName } = jest.requireActual("./attachment-storage") as typeof storage;

	it("restores Cyrillic names that multer decoded as latin1", () => {
		const latin1 = Buffer.from("Отчёт.pdf", "utf8").toString("latin1");
		expect(normalizeFileName(latin1)).toBe("Отчёт.pdf");
	});

	it("drops directories and unsafe characters", () => {
		expect(normalizeFileName("../../etc/pass:wd?.txt")).toBe("pass_wd_.txt");
	});
});

describe("AttachmentsService", () => {
	const prisma = {
		attachment: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
	};
	const tasks = {
		getViewableTask: jest.fn().mockResolvedValue({ id: "t1" }),
		getEditableTask: jest.fn(),
	};
	const service = new AttachmentsService(prisma as unknown as PrismaService, tasks as unknown as TasksService);
	const user = { id: "u1", email: "u@tasko.local", fullName: "U", systemRole: "EXECUTOR" as const, isActive: true };
	const uploader = { id: "u1", fullName: "U", email: "u@tasko.local", createdAt: new Date(), updatedAt: new Date() };
	const pdf = { buffer: Buffer.from("x"), mimetype: "application/pdf", originalname: "plan.pdf", size: 1 };

	beforeEach(() => jest.clearAllMocks());

	it("stores an allowed file and its metadata", async () => {
		prisma.attachment.create.mockImplementation(async ({ data }) => ({
			id: "a1",
			createdAt: new Date(),
			uploader,
			...data,
		}));

		const result = await service.upload(user, "t1", pdf);

		expect(storage.saveAttachmentFile).toHaveBeenCalledWith("t1", pdf.buffer, "pdf");
		expect(result.originalName).toBe("plan.pdf");
	});

	it("rejects a disallowed type and an oversized file", async () => {
		await expect(service.upload(user, "t1", { ...pdf, mimetype: "application/x-msdownload" })).rejects.toThrow(
			"Такой тип файла нельзя прикрепить",
		);
		await expect(service.upload(user, "t1", { ...pdf, size: 11 * 1024 * 1024 })).rejects.toThrow("10 МБ");
		expect(storage.saveAttachmentFile).not.toHaveBeenCalled();
	});

	it("removes the saved file when the database write fails", async () => {
		prisma.attachment.create.mockRejectedValue(new Error("db down"));

		await expect(service.upload(user, "t1", pdf)).rejects.toThrow("db down");
		expect(storage.removeAttachmentFile).toHaveBeenCalledWith("t1/file.pdf");
	});

	it("lets only the uploader or a task editor delete", async () => {
		prisma.attachment.findUnique.mockResolvedValue({ id: "a1", taskId: "t1", uploadedBy: "u2", storageKey: "k" });
		tasks.getEditableTask.mockRejectedValue(new Error("no"));

		await expect(service.remove(user, "t1", "a1")).rejects.toThrow("Удалить вложение может только");
		expect(prisma.attachment.delete).not.toHaveBeenCalled();
	});
});
