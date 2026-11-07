import { ProfileFieldType } from "@prisma/client";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateProfileFieldDto {
	@IsString()
	@MinLength(1)
	section: string;

	@IsString()
	@MinLength(1)
	name: string;

	@IsEnum(ProfileFieldType)
	type: ProfileFieldType;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	options?: string[];

	@IsOptional()
	@IsInt()
	@Min(0)
	sortOrder?: number;
}

export class UpdateProfileFieldDto {
	@IsOptional()
	@IsString()
	@MinLength(1)
	section?: string;

	@IsOptional()
	@IsString()
	@MinLength(1)
	name?: string;

	@IsOptional()
	@IsEnum(ProfileFieldType)
	type?: ProfileFieldType;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	options?: string[];

	@IsOptional()
	@IsInt()
	@Min(0)
	sortOrder?: number;
}
