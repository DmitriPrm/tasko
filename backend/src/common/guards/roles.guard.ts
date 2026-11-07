import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SystemRole } from "@prisma/client";

import { AuthUser } from "../../auth/auth.types";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const roles = this.reflector.getAllAndOverride<SystemRole[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!roles?.length) {
			return true;
		}

		const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
		if (!user || !roles.includes(user.systemRole)) {
			throw new ForbiddenException("Недостаточно прав");
		}

		return true;
	}
}
