import { Controller, Get, Param, Post } from "@nestjs/common";
import { PredictionTrigger } from "@prisma/client";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PredictionsService } from "../predictions/predictions.service";
import { buildForecast } from "./forecast";
import { TasksService } from "./tasks.service";

@ApiTags("tasks")
@ApiBearerAuth()
@Controller("tasks/:id/prediction")
export class TaskPredictionController {
	constructor(
		private readonly tasks: TasksService,
		private readonly predictions: PredictionsService,
	) {}

	/** Текущий прогноз и история пересчётов */
	@Get()
	async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		const task = await this.tasks.getViewableTask(user, id);
		return this.response(task);
	}

	/** Пересчитать прогноз по кнопке. Если сервис недоступен, вернётся прежний прогноз и mlAvailable: false */
	@Post()
	async refresh(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		const task = await this.tasks.getViewableTask(user, id);
		const prediction = await this.predictions.refresh(id, PredictionTrigger.MANUAL);
		return {
			...(await this.response(prediction ? { ...task, predictions: [prediction] } : task)),
			refreshed: prediction !== null,
		};
	}

	private async response(task: Parameters<typeof buildForecast>[0] & { id: string }) {
		const history = await this.predictions.history(task.id);
		return {
			forecast: buildForecast(task),
			mlEnabled: this.predictions.enabled,
			history: history.map((item) => ({
				id: item.id,
				trigger: item.trigger,
				durationHours: item.durationHours,
				riskProbability: item.riskProbability,
				durationModel: item.durationModel?.version ?? null,
				riskModel: item.riskModel?.version ?? null,
				createdAt: item.createdAt.toISOString(),
			})),
		};
	}
}
