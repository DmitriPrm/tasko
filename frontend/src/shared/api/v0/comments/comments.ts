import { z } from "zod";

import { createGet, createPost } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { ZComment } from "@/shared/api/v0/schemas";

export const getTaskComments = createGet({
	path: "/tasks/:id/comments",
	type: ZWrapDTO(z.array(ZComment)),
});

export const createTaskComment = createPost({
	path: "/tasks/:id/comments",
	type: ZWrapDTO(ZComment),
});
