import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { PredictionsService } from "./predictions.service";

@ApiTags("ml")
@ApiBearerAuth()
@Controller("ml")
export class PredictionsController {
	constructor(private readonly predictions: PredictionsService) {}

	/** Подключён ли сервис прогноза и какие модели сейчас активны */
	@Get("status")
	status() {
		return this.predictions.status();
	}
}
