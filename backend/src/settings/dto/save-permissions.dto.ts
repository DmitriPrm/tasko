import { SystemRole } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsString, ValidateNested } from "class-validator";

class PermissionGrantDto {
	@IsEnum(SystemRole)
	role: SystemRole;

	@IsString()
	code: string;

	@IsBoolean()
	enabled: boolean;
}

export class SavePermissionsDto {
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => PermissionGrantDto)
	grants: PermissionGrantDto[];
}
