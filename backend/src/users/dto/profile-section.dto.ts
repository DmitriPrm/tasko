import { ProfileFieldType } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ProfileSectionDto {
	@IsString()
	@MinLength(1)
	@MaxLength(80)
	title: string;
}

export class CreateProfileFieldDto {
	@IsString()
	@MinLength(1)
	@MaxLength(100)
	name: string;

	@IsOptional()
	@IsEnum(ProfileFieldType)
	type?: ProfileFieldType;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	options?: string[];

	@IsOptional()
	@IsString()
	@MaxLength(5000)
	value?: string;
}

export class UpdateProfileFieldDto {
	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(100)
	name?: string;

	@IsOptional()
	@IsEnum(ProfileFieldType)
	type?: ProfileFieldType;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	options?: string[];

	@IsOptional()
	@IsString()
	@MaxLength(5000)
	value?: string;
}
