import { createGet, createPut } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { ZPermissionMatrix } from "@/shared/api/v0/schemas";

export const getPermissionMatrix = createGet({
	path: "/settings/permissions",
	type: ZWrapDTO(ZPermissionMatrix),
});

export const savePermissionMatrix = createPut({
	path: "/settings/permissions",
	type: ZWrapDTO(ZPermissionMatrix),
});
