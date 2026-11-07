import { ProjectRole } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEmail, IsEnum, MaxLength } from "class-validator";

export class CreateInvitationDto {
	@Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
	@IsEmail()
	@MaxLength(254)
	email: string;

	@IsEnum(ProjectRole)
	projectRole: ProjectRole;
}
