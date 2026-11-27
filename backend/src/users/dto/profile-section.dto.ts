import { ProfileFieldType } from "@prisma/client";
import { IsArray, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";

/** Иконки разделов профиля — те же коды, что нарисованы в интерфейсе */
export const SECTION_ICONS = [
	"award",
	"star",
	"briefcase",
	"book",
	"code",
	"phone",
	"globe",
	"heart",
	"user",
	"flag",
] as const;

export class ProfileSectionDto {
	@IsString()
	@MinLength(1)
	@MaxLength(80)
	title: string;
}

export class UpdateProfileSectionDto {
	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(80)
	title?: string;

	/** null — вернуть автоматический выбор иконки */
	@IsOptional()
	@ValidateIf((dto: UpdateProfileSectionDto) => dto.icon !== null)
	@IsIn(SECTION_ICONS)
	icon?: string | null;
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
