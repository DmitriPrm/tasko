import { SystemRole } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
	@IsEmail()
	email: string;

	@IsString()
	@MinLength(2)
	fullName: string;

	@IsString()
	@MinLength(6)
	password: string;

	@IsOptional()
	@IsEnum(SystemRole)
	systemRole?: SystemRole;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
