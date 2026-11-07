import { ProjectStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProjectDto {
	@IsString()
	@MinLength(2)
	@MaxLength(255)
	name: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsEnum(ProjectStatus)
	status?: ProjectStatus;

	@IsOptional()
	@IsDateString()
	plannedStartAt?: string;

	@IsOptional()
	@IsDateString()
	plannedEndAt?: string;
}
