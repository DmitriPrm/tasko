import { Body, Controller, Delete, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateProfileFieldDto, ProfileSectionDto, UpdateProfileFieldDto } from "./dto/profile-section.dto";
import { ProfileSectionsService } from "./profile-sections.service";

@ApiTags("profile")
@ApiBearerAuth()
@Controller("users/:userId/profile")
export class ProfileSectionsController {
	constructor(private readonly sections: ProfileSectionsService) {}

	@Post("sections")
	createSection(@CurrentUser() user: AuthUser, @Param("userId") userId: string, @Body() dto: ProfileSectionDto) {
		return this.sections.createSection(user, userId, dto.title);
	}

	@Patch("sections/:sectionId")
	renameSection(
		@CurrentUser() user: AuthUser,
		@Param("userId") userId: string,
		@Param("sectionId") sectionId: string,
		@Body() dto: ProfileSectionDto,
	) {
		return this.sections.renameSection(user, userId, sectionId, dto.title);
	}

	@Delete("sections/:sectionId")
	removeSection(
		@CurrentUser() user: AuthUser,
		@Param("userId") userId: string,
		@Param("sectionId") sectionId: string,
	) {
		return this.sections.removeSection(user, userId, sectionId);
	}

	@Post("sections/:sectionId/fields")
	createField(
		@CurrentUser() user: AuthUser,
		@Param("userId") userId: string,
		@Param("sectionId") sectionId: string,
		@Body() dto: CreateProfileFieldDto,
	) {
		return this.sections.createField(user, userId, sectionId, dto);
	}

	@Patch("fields/:fieldId")
	updateField(
		@CurrentUser() user: AuthUser,
		@Param("userId") userId: string,
		@Param("fieldId") fieldId: string,
		@Body() dto: UpdateProfileFieldDto,
	) {
		return this.sections.updateField(user, userId, fieldId, dto);
	}

	@Delete("fields/:fieldId")
	removeField(
		@CurrentUser() user: AuthUser,
		@Param("userId") userId: string,
		@Param("fieldId") fieldId: string,
	) {
		return this.sections.removeField(user, userId, fieldId);
	}
}
