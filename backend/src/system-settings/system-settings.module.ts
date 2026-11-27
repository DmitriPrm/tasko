import { Global, Module } from "@nestjs/common";

import { SystemSettingsService } from "./system-settings.service";

/** Глобальный модуль: системные настройки нужны многим модулям (прогноз, уведомления, файлы, вход) */
@Global()
@Module({
	providers: [SystemSettingsService],
	exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
