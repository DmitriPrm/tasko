import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { SavePermissionsDto } from "./dto/save-permissions.dto";
import { SettingsService } from "./settings.service";

@ApiTags("settings")
@ApiBearerAuth()
@Controller("settings")
export class SettingsController {
	constructor(private readonly settingsService: SettingsService) {}

	@Get("permissions")
	getPermissions(@CurrentUser() user: AuthUser) {
		return this.settingsService.getPermissions(user);
	}

	@Put("permissions")
	savePermissions(@CurrentUser() user: AuthUser, @Body() dto: SavePermissionsDto) {
		return this.settingsService.savePermissions(user, dto);
	}
}
