import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "./auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		configService: ConfigService,
		private readonly prisma: PrismaService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
		});
	}

	async validate(payload: JwtPayload) {
		if (payload.type !== "access") {
			throw new UnauthorizedException("Недействительный токен");
		}

		const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
		if (!user || !user.isActive) {
			throw new UnauthorizedException("Пользователь недоступен");
		}

		return {
			id: user.id,
			email: user.email,
			fullName: user.fullName,
			systemRole: user.systemRole,
			isActive: user.isActive,
		};
	}
}
