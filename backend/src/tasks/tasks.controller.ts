import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreateTaskDto } from "./dto/create-task.dto";
import { TasksQueryDto } from "./dto/tasks-query.dto";
import { TransitionTaskDto } from "./dto/transition-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksService } from "./tasks.service";

@ApiTags("tasks")
@ApiBearerAuth()
@Controller()
export class TasksController {
	constructor(private readonly tasksService: TasksService) {}

	@Get("tasks")
	list(@CurrentUser() user: AuthUser, @Query() query: TasksQueryDto) {
		return this.tasksService.list(user, query);
	}

	@Get("projects/:id/tasks")
	listByProject(
		@CurrentUser() user: AuthUser,
		@Param("id") projectId: string,
		@Query() query: TasksQueryDto,
	) {
		return this.tasksService.listByProject(user, projectId, query);
	}

	@Get("projects/:id/tasks/create")
	createForm(@CurrentUser() user: AuthUser, @Param("id") projectId: string) {
		return this.tasksService.getCreateForm(user, projectId);
	}

	@Post("projects/:id/tasks")
	create(
		@CurrentUser() user: AuthUser,
		@Param("id") projectId: string,
		@Body() dto: CreateTaskDto,
	) {
		return this.tasksService.create(user, projectId, dto);
	}

	@Get("tasks/:id")
	getById(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.tasksService.getById(user, id);
	}

	@Get("tasks/:id/edit")
	editForm(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.tasksService.getEditForm(user, id);
	}

	@Patch("tasks/:id")
	update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateTaskDto) {
		return this.tasksService.update(user, id, dto);
	}

	@Delete("tasks/:id")
	remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.tasksService.remove(user, id);
	}

	@Post("tasks/:id/transitions")
	transition(
		@CurrentUser() user: AuthUser,
		@Param("id") id: string,
		@Body() dto: TransitionTaskDto,
	) {
		return this.tasksService.transition(user, id, dto);
	}

	@Get("tasks/:id/history")
	history(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.tasksService.history(user, id);
	}
}
