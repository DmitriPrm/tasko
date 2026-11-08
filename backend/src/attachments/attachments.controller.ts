import { Controller, Delete, Get, Param, Post, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";

import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MAX_ATTACHMENT_BYTES } from "./attachment-storage";
import { AttachmentsService, UploadedAttachment } from "./attachments.service";

@ApiTags("attachments")
@ApiBearerAuth()
@Controller("tasks/:id/attachments")
export class AttachmentsController {
	constructor(private readonly attachments: AttachmentsService) {}

	@Get()
	list(@CurrentUser() user: AuthUser, @Param("id") taskId: string) {
		return this.attachments.list(user, taskId);
	}

	@Post()
	@ApiConsumes("multipart/form-data")
	// Лимит с запасом в байт: точную проверку и понятное сообщение даёт сервис
	@UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_ATTACHMENT_BYTES + 1 } }))
	upload(@CurrentUser() user: AuthUser, @Param("id") taskId: string, @UploadedFile() file?: UploadedAttachment) {
		return this.attachments.upload(user, taskId, file);
	}

	@Get(":attachmentId/download")
	async download(
		@CurrentUser() user: AuthUser,
		@Param("id") taskId: string,
		@Param("attachmentId") attachmentId: string,
	) {
		const { item, stream } = await this.attachments.open(user, taskId, attachmentId);
		return new StreamableFile(stream, {
			type: item.mimeType,
			length: item.sizeBytes,
			disposition: `attachment; filename*=UTF-8''${encodeURIComponent(item.originalName)}`,
		});
	}

	@Delete(":attachmentId")
	remove(@CurrentUser() user: AuthUser, @Param("id") taskId: string, @Param("attachmentId") attachmentId: string) {
		return this.attachments.remove(user, taskId, attachmentId);
	}
}
