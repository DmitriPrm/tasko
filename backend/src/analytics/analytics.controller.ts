import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AccessService } from "../access/access.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@ApiBearerAuth()
@Controller("projects/:id/analytics")
export class AnalyticsController {
	constructor(
		private readonly analyticsService: AnalyticsService,
		private readonly access: AccessService,
	) {}

	@Get("overview")
	async overview(@CurrentUser() user: AuthUser, @Param("id") projectId: string) {
		await this.access.assert(user, "ANALYTICS_VIEW");
		return this.analyticsService.overview(user, projectId);
	}

	@Get("workload")
	async workload(@CurrentUser() user: AuthUser, @Param("id") projectId: string) {
		await this.access.assert(user, "ANALYTICS_VIEW");
		return this.analyticsService.workload(user, projectId);
	}
}
