import { createDelete, createGet, createPatch, createPost } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { ZFormSchema, ZPaginated, ZTask, ZTaskHistory, ZTaskRemoveResult } from "@/shared/api/v0/schemas";

export const getTasks = createGet({
	path: "/tasks",
	type: ZWrapDTO(ZPaginated(ZTask)),
});

export const getProjectTasks = createGet({
	path: "/projects/:id/tasks",
	type: ZWrapDTO(ZPaginated(ZTask)),
});

export const getTaskCreateForm = createGet({
	path: "/projects/:id/tasks/create",
	type: ZWrapDTO(ZFormSchema),
});

export const createTask = createPost({
	path: "/projects/:id/tasks",
	type: ZWrapDTO(ZTask),
});

export const getTaskEditForm = createGet({
	path: "/tasks/:id/edit",
	type: ZWrapDTO(ZFormSchema),
});

export const getTask = createGet({
	path: "/tasks/:id",
	type: ZWrapDTO(ZTask),
});

export const updateTask = createPatch({
	path: "/tasks/:id",
	type: ZWrapDTO(ZTask),
});

export const deleteTask = createDelete({
	path: "/tasks/:id",
	type: ZWrapDTO(ZTaskRemoveResult),
});

export const transitionTask = createPost({
	path: "/tasks/:id/transitions",
	type: ZWrapDTO(ZTask),
});

export const getTaskHistory = createGet({
	path: "/tasks/:id/history",
	type: ZWrapDTO(ZTaskHistory),
});
