import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { PredictionsModule } from "../predictions/predictions.module";
import { ProjectsModule } from "../projects/projects.module";
import { TaskPredictionController } from "./task-prediction.controller";
import { TaskRelationsController } from "./task-relations.controller";
import { TaskRelationsService } from "./task-relations.service";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
	imports: [ProjectsModule, NotificationsModule, PredictionsModule],
	controllers: [TasksController, TaskRelationsController, TaskPredictionController],
	providers: [TasksService, TaskRelationsService],
	exports: [TasksService],
})
export class TasksModule {}
