import { Injectable } from "@nestjs/common";

import { AccessService } from "../access/access.service";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { SystemSettingsService } from "../system-settings/system-settings.service";
import { SavePermissionsDto } from "./dto/save-permissions.dto";

@Injectable()
export class SettingsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly access: AccessService,
		private readonly system: SystemSettingsService,
	) {}

	async getSystem(user: AuthUser) {
		await this.access.assert(user, "SETTINGS_SYSTEM");
		return this.system.get();
	}

	async updateSystem(user: AuthUser, patch: Record<string, unknown>) {
		await this.access.assert(user, "SETTINGS_SYSTEM");
		return this.system.update(patch ?? {}, user.id);
	}

	getPublic() {
		return this.system.publicSettings();
	}

	async getPermissions(user: AuthUser) {
		await this.access.assert(user, "SETTINGS_PERMISSIONS");
		return this.access.matrix();
	}

	async savePermissions(user: AuthUser, dto: SavePermissionsDto) {
		await this.access.assert(user, "SETTINGS_PERMISSIONS");
		return this.access.saveMatrix(dto.grants);
	}
}
