import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { mergePreferences, readPreferences } from "./user-preferences";

/** Личные настройки текущего пользователя */
@ApiTags("me")
@ApiBearerAuth()
@Controller("me")
export class MeController {
	constructor(private readonly prisma: PrismaService) {}

	@Get("preferences")
	async getPreferences(@CurrentUser() user: AuthUser) {
		const row = await this.prisma.user.findUnique({ where: { id: user.id }, select: { preferences: true } });
		return readPreferences(row?.preferences);
	}

	@Patch("preferences")
	async updatePreferences(@CurrentUser() user: AuthUser, @Body() patch: Record<string, unknown>) {
		const row = await this.prisma.user.findUnique({ where: { id: user.id }, select: { preferences: true } });
		const next = mergePreferences(readPreferences(row?.preferences), patch ?? {});
		await this.prisma.user.update({ where: { id: user.id }, data: { preferences: next as object } });
		return next;
	}
}
