import { createGet, createPut } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { ZTableLayout } from "@/shared/api/v0/schemas";

export const getTableLayout = createGet({
	path: "/table-layouts/:code",
	type: ZWrapDTO(ZTableLayout),
});

export const saveTableLayout = createPut({
	path: "/table-layouts/:code",
	type: ZWrapDTO(ZTableLayout),
});
