import { z } from "zod";

import { createDelete, createGet, createPatch, createPost } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { ZComment, ZSuccess } from "@/shared/api/v0/schemas";

export const getTaskComments = createGet({
	path: "/tasks/:id/comments",
	type: ZWrapDTO(z.array(ZComment)),
});

export const createTaskComment = createPost({
	path: "/tasks/:id/comments",
	type: ZWrapDTO(ZComment),
});

/** Исправить свой комментарий */
export const updateTaskComment = createPatch({
	path: "/tasks/:id/comments/:commentId",
	type: ZWrapDTO(ZComment),
});

/** Удалить: автор, руководитель проекта или администратор */
export const deleteTaskComment = createDelete({
	path: "/tasks/:id/comments/:commentId",
	type: ZWrapDTO(ZSuccess),
});
