import { createReadStream } from "fs";

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Attachment, User } from "@prisma/client";

import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { TasksService } from "../tasks/tasks.service";
import { toUserDto } from "../users/user.mapper";
import {
	ALLOWED_MIME,
	MAX_ATTACHMENT_BYTES,
	normalizeFileName,
	removeAttachmentFile,
	resolveAttachmentPath,
	saveAttachmentFile,
} from "./attachment-storage";

export interface UploadedAttachment {
	buffer: Buffer;
	mimetype: string;
	originalname: string;
	size: number;
}

function toAttachmentDto(item: Attachment & { uploader: User }) {
	return {
		id: item.id,
		taskId: item.taskId,
		originalName: item.originalName,
		mimeType: item.mimeType,
		sizeBytes: item.sizeBytes,
		createdAt: item.createdAt.toISOString(),
		uploader: toUserDto(item.uploader),
	};
}

@Injectable()
export class AttachmentsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly tasks: TasksService,
	) {}

	async list(user: AuthUser, taskId: string) {
		await this.tasks.getViewableTask(user, taskId);
		const items = await this.prisma.attachment.findMany({
			where: { taskId },
			include: { uploader: true },
			orderBy: { createdAt: "asc" },
		});
		return items.map(toAttachmentDto);
	}

	/** Прикрепить файл может любой, кто видит задачу: исполнителю это нужно для результатов работы */
	async upload(user: AuthUser, taskId: string, file?: UploadedAttachment) {
		await this.tasks.getViewableTask(user, taskId);
		if (!file) throw new BadRequestException("Файл не передан");
		if (file.size > MAX_ATTACHMENT_BYTES) throw new BadRequestException("Файл больше 10 МБ");
		const ext = ALLOWED_MIME[file.mimetype];
		if (!ext) throw new BadRequestException("Такой тип файла нельзя прикрепить");

		const storageKey = saveAttachmentFile(taskId, file.buffer, ext);
		try {
			const item = await this.prisma.attachment.create({
				data: {
					taskId,
					uploadedBy: user.id,
					originalName: normalizeFileName(file.originalname),
					storageKey,
					mimeType: file.mimetype,
					sizeBytes: file.size,
				},
				include: { uploader: true },
			});
			return toAttachmentDto(item);
		} catch (error) {
			// Без записи в базе файл никому не нужен
			removeAttachmentFile(storageKey);
			throw error;
		}
	}

	async open(user: AuthUser, taskId: string, attachmentId: string) {
		await this.tasks.getViewableTask(user, taskId);
		const item = await this.findOrThrow(taskId, attachmentId);
		const full = resolveAttachmentPath(item.storageKey);
		if (!full) throw new NotFoundException("Файл не найден в хранилище");
		return { item, stream: createReadStream(full) };
	}

	/** Удалить вложение может тот, кто его загрузил, или тот, кто вправе менять задачу */
	async remove(user: AuthUser, taskId: string, attachmentId: string) {
		await this.tasks.getViewableTask(user, taskId);
		const item = await this.findOrThrow(taskId, attachmentId);
		if (item.uploadedBy !== user.id) {
			await this.tasks.getEditableTask(user, taskId).catch(() => {
				throw new ForbiddenException("Удалить вложение может только загрузивший его или редактор задачи");
			});
		}
		await this.prisma.attachment.delete({ where: { id: attachmentId } });
		removeAttachmentFile(item.storageKey);
		return { success: true };
	}

	private async findOrThrow(taskId: string, attachmentId: string) {
		const item = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
		if (!item || item.taskId !== taskId) throw new NotFoundException("Вложение не найдено");
		return item;
	}
}
