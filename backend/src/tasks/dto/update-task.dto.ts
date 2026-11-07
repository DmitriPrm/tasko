import { TaskPriority, TaskType } from "@prisma/client";
import {
	IsArray,
	IsBoolean,
	IsDateString,
	IsEnum,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	MinLength,
} from "class-validator";

export class UpdateTaskDto {
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(255)
	title?: string;

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
	assigneeId?: string | null;

	@IsOptional()
	@IsDateString()
	plannedStartAt?: string | null;

	@IsOptional()
	@IsDateString()
	deadlineAt?: string | null;

	@IsOptional()
	@IsBoolean()
	isCompleted?: boolean;

	@IsOptional()
	@IsArray()
	@IsUUID("4", { each: true })
	tagIds?: string[];

	@IsOptional()
	@IsArray()
	@IsUUID("4", { each: true })
	coAssigneeIds?: string[];
}
