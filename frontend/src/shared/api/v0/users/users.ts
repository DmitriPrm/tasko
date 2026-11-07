import { createDelete, createGet, createPatch, createPost } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import {
	ZFormSchema,
	ZPaginated,
	ZProfile,
	ZProfileField,
	ZProfileSection,
	ZSuccess,
	ZUser,
} from "@/shared/api/v0/schemas";

export const getUsers = createGet({
	path: "/users",
	type: ZWrapDTO(ZPaginated(ZUser)),
});

export const getUserCreateForm = createGet({
	path: "/users/create",
	type: ZWrapDTO(ZFormSchema),
});

export const createUser = createPost({
	path: "/users",
	type: ZWrapDTO(ZUser),
});

export const getUser = createGet({
	path: "/users/:id",
	type: ZWrapDTO(ZUser),
});

export const getProfile = createGet({
	path: "/users/:id/profile",
	type: ZWrapDTO(ZProfile),
});

export const updateProfile = createPatch({
	path: "/users/:id/profile",
	type: ZWrapDTO(ZProfile),
});

export const updateRights = createPatch({
	path: "/users/:id/rights",
	type: ZWrapDTO(ZProfile),
});

export const updateAvatar = createPost({
	path: "/users/:id/avatar",
	type: ZWrapDTO(ZProfile),
});

export const updateUser = createPatch({
	path: "/users/:id",
	type: ZWrapDTO(ZUser),
});

export const createProfileSection = createPost({
	path: "/users/:userId/profile/sections",
	type: ZWrapDTO(ZProfileSection),
});

export const renameProfileSection = createPatch({
	path: "/users/:userId/profile/sections/:sectionId",
	type: ZWrapDTO(ZProfileSection),
});

export const removeProfileSection = createDelete({
	path: "/users/:userId/profile/sections/:sectionId",
	type: ZWrapDTO(ZSuccess),
});

export const createProfileField = createPost({
	path: "/users/:userId/profile/sections/:sectionId/fields",
	type: ZWrapDTO(ZProfileField),
});

export const updateProfileField = createPatch({
	path: "/users/:userId/profile/fields/:fieldId",
	type: ZWrapDTO(ZProfileField),
});

export const removeProfileField = createDelete({
	path: "/users/:userId/profile/fields/:fieldId",
	type: ZWrapDTO(ZSuccess),
});
