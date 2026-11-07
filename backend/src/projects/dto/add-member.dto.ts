import { ProjectRole } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";

export class AddMemberDto {
	@IsUUID()
	userId: string;

	@IsEnum(ProjectRole)
	projectRole: ProjectRole;
}
