import { TaskStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class TransitionTaskDto {
	/** Нужен либо статус, либо целевая колонка (статус берётся у колонки) */
	@IsOptional()
	@IsEnum(TaskStatus)
	status?: TaskStatus;

	@IsOptional()
	@IsUUID()
	columnId?: string;

	@IsOptional()
	@IsString()
	comment?: string;
}
