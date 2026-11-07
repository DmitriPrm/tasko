import { Injectable } from "@nestjs/common";

import { AccessService } from "../access/access.service";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { SavePermissionsDto } from "./dto/save-permissions.dto";

@Injectable()
export class SettingsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly access: AccessService,
	) {}

	async getPermissions(user: AuthUser) {
		await this.access.assert(user, "SETTINGS_PERMISSIONS");
		return this.access.matrix();
	}

	async savePermissions(user: AuthUser, dto: SavePermissionsDto) {
		await this.access.assert(user, "SETTINGS_PERMISSIONS");
		return this.access.saveMatrix(dto.grants);
	}
}
