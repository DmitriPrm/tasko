import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class TasksQueryDto extends PaginationQueryDto {
	@IsOptional()
	@IsUUID()
	projectId?: string;

	@IsOptional()
	@IsUUID()
	assigneeId?: string;

	@IsOptional()
	@IsEnum(TaskStatus)
	status?: TaskStatus;

	@IsOptional()
	@IsEnum(TaskPriority)
	priority?: TaskPriority;

	@IsOptional()
	@IsEnum(TaskType)
	type?: TaskType;

	@IsOptional()
	@IsString()
	search?: string;

	@IsOptional()
	@IsString()
	sortBy?: "deadlineAt" | "priority" | "createdAt";

	@IsOptional()
	@IsString()
	sortOrder?: "asc" | "desc";
}
