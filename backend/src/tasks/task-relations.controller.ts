import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateDependencyDto } from "./dto/create-dependency.dto";
import { TaskRelationsService } from "./task-relations.service";

@ApiTags("tasks")
@ApiBearerAuth()
@Controller("tasks/:id")
export class TaskRelationsController {
	constructor(private readonly relations: TaskRelationsService) {}

	@Get("subtasks")
	subtasks(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.relations.subtasks(user, id);
	}

	@Get("dependencies")
	dependencies(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.relations.dependencies(user, id);
	}

	@Post("dependencies")
	addDependency(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CreateDependencyDto) {
		return this.relations.addDependency(user, id, dto);
	}

	@Delete("dependencies/:dependencyId")
	removeDependency(
		@CurrentUser() user: AuthUser,
		@Param("id") id: string,
		@Param("dependencyId") dependencyId: string,
	) {
		return this.relations.removeDependency(user, id, dependencyId);
	}
}
