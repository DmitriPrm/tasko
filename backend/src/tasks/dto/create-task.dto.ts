import { TaskPriority, TaskType } from "@prisma/client";
import {
	IsDateString,
	IsEnum,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	MinLength,
} from "class-validator";

export class CreateTaskDto {
	@IsString()
	@MinLength(1)
	@MaxLength(255)
	title: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsEnum(TaskType)
	type?: TaskType;

	@IsOptional()
	@IsEnum(TaskPriority)
	priority?: TaskPriority;

	@IsOptional()
	@IsUUID()
	columnId?: string;

	@IsOptional()
	@IsUUID()
	assigneeId?: string;

	@IsOptional()
	@IsUUID()
	parentTaskId?: string;

	@IsOptional()
	@IsDateString()
	plannedStartAt?: string;

	@IsOptional()
	@IsDateString()
	deadlineAt?: string;
}
