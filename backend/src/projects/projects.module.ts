import { Module } from "@nestjs/common";

import { ProjectColumnsService } from "./project-columns.service";
import { ProjectAccessService } from "./project-access.service";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
	controllers: [ProjectsController],
	providers: [ProjectsService, ProjectAccessService, ProjectColumnsService],
	exports: [ProjectAccessService],
})
export class ProjectsModule {}
