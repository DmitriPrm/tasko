import { Module } from "@nestjs/common";

import { MlClient } from "./ml-client";
import { PredictionsController } from "./predictions.controller";
import { PredictionsService } from "./predictions.service";

@Module({
	controllers: [PredictionsController],
	providers: [MlClient, PredictionsService],
	exports: [PredictionsService],
})
export class PredictionsModule {}
