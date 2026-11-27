import { z } from "zod";

import { createGet } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { ZAnalyticsOverview, ZRiskAnalytics, ZWorkloadItem } from "@/shared/api/v0/schemas";

export const getProjectAnalytics = createGet({
	path: "/projects/:id/analytics/overview",
	type: ZWrapDTO(ZAnalyticsOverview),
});

export const getProjectWorkload = createGet({
	path: "/projects/:id/analytics/workload",
	type: ZWrapDTO(z.array(ZWorkloadItem)),
});

export const getProjectRisks = createGet({
	path: "/projects/:id/analytics/risks",
	type: ZWrapDTO(ZRiskAnalytics),
});
