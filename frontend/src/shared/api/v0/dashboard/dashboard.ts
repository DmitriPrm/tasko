import { createGet } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { ZDashboard } from "@/shared/api/v0/schemas";

export const getDashboard = createGet({
	path: "/dashboard",
	type: ZWrapDTO(ZDashboard),
});
