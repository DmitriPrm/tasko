import { z } from "zod";

import { createDelete, createGet, createPatch, createPost } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import {
	ZFormSchema,
	ZPaginated,
	ZProject,
	ZProjectColumn,
	ZProjectMember,
	ZSuccess,
	ZTag,
} from "@/shared/api/v0/schemas";

export const getProjects = createGet({
	path: "/projects",
	type: ZWrapDTO(ZPaginated(ZProject)),
});

export const getFavoriteProjects = createGet({
	path: "/projects/favorites",
	type: ZWrapDTO(z.array(ZProject)),
});

export const addProjectFavorite = createPost({
	path: "/projects/:id/favorite",
	type: ZWrapDTO(ZProject),
});

export const removeProjectFavorite = createDelete({
	path: "/projects/:id/favorite",
	type: ZWrapDTO(ZProject),
});

export const getProjectTags = createGet({
	path: "/projects/:id/tags",
	type: ZWrapDTO(z.array(ZTag)),
});

export const createProjectTag = createPost({
	path: "/projects/:id/tags",
	type: ZWrapDTO(ZTag),
});

export const removeProjectTag = createDelete({
	path: "/projects/:id/tags/:tagId",
	type: ZWrapDTO(ZSuccess),
});

export const getProjectCreateForm = createGet({
	path: "/projects/create",
	type: ZWrapDTO(ZFormSchema),
});

export const createProject = createPost({
	path: "/projects",
	type: ZWrapDTO(ZProject),
});

export const getProjectEditForm = createGet({
	path: "/projects/:id/edit",
	type: ZWrapDTO(ZFormSchema),
});

export const getProject = createGet({
	path: "/projects/:id",
	type: ZWrapDTO(ZProject),
});

export const updateProject = createPatch({
	path: "/projects/:id",
	type: ZWrapDTO(ZProject),
});

export const deleteProject = createDelete({
	path: "/projects/:id",
	type: ZWrapDTO(ZSuccess),
});

export const archiveProject = createPost({
	path: "/projects/:id/archive",
	type: ZWrapDTO(ZProject),
});

export const getProjectMembers = createGet({
	path: "/projects/:id/members",
	type: ZWrapDTO(z.array(ZProjectMember)),
});

export const addProjectMember = createPost({
	path: "/projects/:id/members",
	type: ZWrapDTO(ZProjectMember),
});

export const removeProjectMember = createDelete({
	path: "/projects/:id/members/:userId",
	type: ZWrapDTO(ZSuccess),
});

export const getProjectColumns = createGet({
	path: "/projects/:id/columns",
	type: ZWrapDTO(z.array(ZProjectColumn)),
});

export const createProjectColumn = createPost({
	path: "/projects/:id/columns",
	type: ZWrapDTO(ZProjectColumn),
});

export const updateProjectColumn = createPatch({
	path: "/projects/:id/columns/:columnId",
	type: ZWrapDTO(ZProjectColumn),
});

export const deleteProjectColumn = createDelete({
	path: "/projects/:id/columns/:columnId",
	type: ZWrapDTO(ZSuccess),
});
