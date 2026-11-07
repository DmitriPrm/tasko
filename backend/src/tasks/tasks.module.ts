import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectsModule } from "../projects/projects.module";
import { TaskRelationsController } from "./task-relations.controller";
import { TaskRelationsService } from "./task-relations.service";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
	imports: [ProjectsModule, NotificationsModule],
	controllers: [TasksController, TaskRelationsController],
	providers: [TasksService, TaskRelationsService],
	exports: [TasksService],
})
export class TasksModule {}
