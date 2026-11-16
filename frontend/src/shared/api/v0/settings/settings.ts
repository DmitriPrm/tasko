import { z } from "zod";

import { createGet, createPatch, createPost, createPut } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import {
	ZMlReload,
	ZMlRecompute,
	ZMlStatus,
	ZPermissionMatrix,
	ZPublicSettings,
	ZSystemSettings,
} from "@/shared/api/v0/schemas";

export const getPermissionMatrix = createGet({
	path: "/settings/permissions",
	type: ZWrapDTO(ZPermissionMatrix),
});

export const savePermissionMatrix = createPut({
	path: "/settings/permissions",
	type: ZWrapDTO(ZPermissionMatrix),
});

export const getSystemSettings = createGet({
	path: "/settings/system",
	type: ZWrapDTO(ZSystemSettings),
});

/** Изменить один или несколько разделов: { risk: {...}, ml: {...} } */
export const updateSystemSettings = createPatch({
	path: "/settings/system",
	type: ZWrapDTO(ZSystemSettings),
});

export const getPublicSettings = createGet({
	path: "/settings/public",
	type: ZWrapDTO(ZPublicSettings),
});

export const getMlStatus = createGet({
	path: "/ml/status",
	type: ZWrapDTO(ZMlStatus),
});

export const reloadMlModels = createPost({
	path: "/ml/reload",
	type: ZWrapDTO(ZMlReload),
});

export const recomputeForecasts = createPost({
	path: "/ml/recompute",
	type: ZWrapDTO(ZMlRecompute),
});

export const testMail = createPost({
	path: "/settings/mail/test",
	type: ZWrapDTO(z.object({ configured: z.boolean(), sent: z.boolean(), to: z.string() })),
});
