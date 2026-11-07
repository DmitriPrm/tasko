import { SystemRole } from "@prisma/client";

export interface AuthUser {
	id: string;
	email: string;
	fullName: string;
	systemRole: SystemRole;
	isActive: boolean;
}

export interface JwtPayload {
	sub: string;
	email: string;
	type: "access" | "refresh";
}
