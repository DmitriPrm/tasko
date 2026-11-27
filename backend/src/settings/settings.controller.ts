import { Body, Controller, Get, Patch, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
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

	/** Системные настройки целиком — для администратора */
	@Get("system")
	getSystem(@CurrentUser() user: AuthUser) {
		return this.settingsService.getSystem(user);
	}

	/** Изменить один или несколько разделов: { risk: {...}, ml: {...} } */
	@Patch("system")
	updateSystem(@CurrentUser() user: AuthUser, @Body() patch: Record<string, unknown>) {
		return this.settingsService.updateSystem(user, patch);
	}

	/** Отправить тестовое письмо себе: проверить, что почта настроена */
	@Post("mail/test")
	testMail(@CurrentUser() user: AuthUser) {
		return this.settingsService.testMail(user);
	}

	/** То, что нужно интерфейсу любого пользователя (и странице регистрации): пороги, файлы, вид проекта */
	@Public()
	@Get("public")
	getPublic() {
		return this.settingsService.getPublic();
	}

	@Put("permissions")
	savePermissions(@CurrentUser() user: AuthUser, @Body() dto: SavePermissionsDto) {
		return this.settingsService.savePermissions(user, dto);
	}
}
