import { z } from "zod";

import { createDelete, createGet, createPost } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { apiInstance } from "@/shared/api/v0/base";
import { ZAttachment, ZSuccess } from "@/shared/api/v0/schemas";

export const getTaskAttachments = createGet({
	path: "/tasks/:id/attachments",
	type: ZWrapDTO(z.array(ZAttachment)),
});

/** payload — FormData с полем file */
export const uploadTaskAttachment = createPost({
	path: "/tasks/:id/attachments",
	type: ZWrapDTO(ZAttachment),
});

export const deleteTaskAttachment = createDelete({
	path: "/tasks/:id/attachments/:attachmentId",
	type: ZWrapDTO(ZSuccess),
});

/** Файл отдаётся только с токеном, поэтому качаем через axios и сохраняем как blob */
export async function downloadTaskAttachment(taskId: string, attachmentId: string, fileName: string) {
	const { data } = await apiInstance.get<Blob>(`/tasks/${taskId}/attachments/${attachmentId}/download`, {
		responseType: "blob",
	});
	const url = URL.createObjectURL(data);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	link.click();
	URL.revokeObjectURL(url);
}
