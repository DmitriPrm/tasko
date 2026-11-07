import { SystemRole } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
	@IsOptional()
	@IsString()
	@MinLength(2)
	fullName?: string;

	@IsOptional()
	@IsEnum(SystemRole)
	systemRole?: SystemRole;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;

	@IsOptional()
	@IsString()
	@MinLength(6)
	password?: string;
}
