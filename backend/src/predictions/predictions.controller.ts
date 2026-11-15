import { Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AccessService } from "../access/access.service";
import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PredictionsService } from "./predictions.service";

@ApiTags("ml")
@ApiBearerAuth()
@Controller("ml")
export class PredictionsController {
	constructor(
		private readonly predictions: PredictionsService,
		private readonly access: AccessService,
	) {}

	/** Подключён ли сервис прогноза и какие модели сейчас активны */
	@Get("status")
	status() {
		return this.predictions.status();
	}

	@Post("reload")
	async reload(@CurrentUser() user: AuthUser) {
		await this.access.assert(user, "SETTINGS_SYSTEM");
		return this.predictions.reloadModels();
	}

	@Post("recompute")
	async recompute(@CurrentUser() user: AuthUser) {
		await this.access.assert(user, "SETTINGS_SYSTEM");
		return this.predictions.recomputeAll();
	}
}
