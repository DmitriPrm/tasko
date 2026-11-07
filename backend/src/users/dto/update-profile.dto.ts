import { SystemRole } from "@prisma/client";
import { IsArray, IsEnum, IsString, MinLength } from "class-validator";

export class UpdateProfileDto {
	@IsString()
	@MinLength(2)
	fullName: string;
}

export class UpdateRightsDto {
	@IsEnum(SystemRole)
	systemRole: SystemRole;

	@IsArray()
	@IsString({ each: true })
	permissions: string[];
}
