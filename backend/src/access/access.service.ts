import { ForbiddenException, Injectable } from "@nestjs/common";
import { SystemRole } from "@prisma/client";

import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { PERMISSIONS, PermissionCode, ROLE_DEFAULTS, isPermissionCode } from "./permissions";

@Injectable()
export class AccessService {
	constructor(private readonly prisma: PrismaService) {}

	async has(user: AuthUser, code: PermissionCode) {
		const override = await this.prisma.userPermission.findUnique({
			where: { userId_code: { userId: user.id, code } },
		});
		if (override) return override.enabled;

		const grant = await this.prisma.rolePermission.findUnique({
			where: { role_code: { role: user.systemRole, code } },
		});
		if (grant) return grant.enabled;

		return ROLE_DEFAULTS[user.systemRole].includes(code);
	}

	async assert(user: AuthUser, code: PermissionCode) {
		if (!(await this.has(user, code))) {
			throw new ForbiddenException("Недостаточно прав");
		}
	}

	async listEffective(user: Pick<AuthUser, "id" | "systemRole">) {
		const [overrides, grants] = await Promise.all([
			this.prisma.userPermission.findMany({ where: { userId: user.id } }),
			this.prisma.rolePermission.findMany({ where: { role: user.systemRole } }),
		]);

		return PERMISSIONS.map((item) => item.code).filter((code) => {
			const override = overrides.find((item) => item.code === code);
			if (override) return override.enabled;
			const grant = grants.find((item) => item.code === code);
			if (grant) return grant.enabled;
			return ROLE_DEFAULTS[user.systemRole].includes(code);
		});
	}

	async matrix() {
		const grants = await this.prisma.rolePermission.findMany();
		const roles = Object.values(SystemRole);

		return {
			roles,
			items: PERMISSIONS.map((item) => ({ code: item.code, group: item.group })),
			grants: roles.flatMap((role) =>
				PERMISSIONS.map((item) => {
					const stored = grants.find((grant) => grant.role === role && grant.code === item.code);
					return {
						role,
						code: item.code,
						enabled: stored ? stored.enabled : ROLE_DEFAULTS[role].includes(item.code),
					};
				}),
			),
		};
	}

	async saveMatrix(grants: { role: SystemRole; code: string; enabled: boolean }[]) {
		// Администратор не может отобрать у себя доступ к настройке прав, иначе систему не вернуть
		const rows = grants
			.filter((grant) => isPermissionCode(grant.code))
			.map((grant) =>
				grant.role === SystemRole.ADMIN && grant.code === "SETTINGS_PERMISSIONS" ? { ...grant, enabled: true } : grant,
			);
		await this.prisma.$transaction(
			rows.map((grant) =>
				this.prisma.rolePermission.upsert({
					where: { role_code: { role: grant.role, code: grant.code } },
					update: { enabled: grant.enabled },
					create: { role: grant.role, code: grant.code, enabled: grant.enabled },
				}),
			),
		);
		return this.matrix();
	}

	async saveUserPermissions(userId: string, codes: string[]) {
		const enabled = new Set(codes.filter(isPermissionCode));
		await this.prisma.$transaction([
			this.prisma.userPermission.deleteMany({ where: { userId } }),
			this.prisma.userPermission.createMany({
				data: PERMISSIONS.map((item) => ({
					userId,
					code: item.code,
					enabled: enabled.has(item.code),
				})),
			}),
		]);
	}
}
