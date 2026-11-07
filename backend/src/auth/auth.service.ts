import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma, SystemRole, User } from "@prisma/client";
import * as bcrypt from "bcrypt";

import { AccessService } from "../access/access.service";
import { saveGeneratedAvatar } from "../common/avatar/files";
import { generateToken, hashToken } from "../common/security/tokens";
import { InvitationsService } from "../invitations/invitations.service";
import { MailService } from "../mail/mail.service";
import { verifyEmailMail } from "../mail/mail.templates";
import { PrismaService } from "../prisma/prisma.service";
import { toUserDto } from "../users/user.mapper";
import { AuthUser, JwtPayload } from "./auth.types";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

const VERIFICATION_TTL_HOURS = 24;

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		private readonly access: AccessService,
		private readonly mail: MailService,
		private readonly invitations: InvitationsService,
	) {}

	async login(dto: LoginDto) {
		const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
		if (!user || !user.isActive) {
			throw new UnauthorizedException("Неверный email или пароль");
		}

		const isValid = await bcrypt.compare(dto.password, user.passwordHash);
		if (!isValid) {
			throw new UnauthorizedException("Неверный email или пароль");
		}

		return {
			...this.issueTokens(user.id, user.email),
			user: {
				...toUserDto(user),
				permissions: await this.access.listEffective(user),
			},
		};
	}

	async register(dto: RegisterDto) {
		const email = dto.email.trim().toLowerCase();
		if (await this.prisma.user.findUnique({ where: { email } })) {
			throw new ConflictException("Пользователь с таким email уже зарегистрирован");
		}

		// Приглашение на этот же адрес подтверждает владение почтой
		const invitation = dto.inviteToken ? await this.invitations.findActiveByToken(dto.inviteToken) : null;
		const verifiedByInvitation = Boolean(invitation && invitation.email.toLowerCase() === email);

		let created: User;
		try {
			created = await this.prisma.user.create({
				data: {
					email,
					fullName: dto.fullName.trim(),
					passwordHash: await bcrypt.hash(dto.password, 10),
					systemRole: SystemRole.EXECUTOR,
					emailVerifiedAt: verifiedByInvitation ? new Date() : null,
				},
			});
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
				throw new ConflictException("Пользователь с таким email уже зарегистрирован");
			}
			throw error;
		}

		const user = await this.prisma.user.update({
			where: { id: created.id },
			data: { avatarFile: saveGeneratedAvatar(created.id) },
		});

		let joinedProjectId: string | null = null;
		let verificationSent = false;
		if (invitation && verifiedByInvitation) {
			const result = await this.invitations.acceptForUser(invitation, user.id);
			joinedProjectId = result?.projectId ?? null;
		} else {
			verificationSent = await this.sendVerification(user);
		}

		return {
			...this.issueTokens(user.id, user.email),
			user: {
				...toUserDto(user),
				permissions: await this.access.listEffective(user),
			},
			verificationSent,
			joinedProjectId,
		};
	}

	async verifyEmail(token: string) {
		const record = await this.prisma.emailVerificationToken.findUnique({
			where: { tokenHash: hashToken(token) },
		});
		if (!record || record.expiresAt < new Date()) {
			throw new BadRequestException("Ссылка недействительна или устарела. Запросите новое письмо");
		}

		await this.prisma.$transaction([
			this.prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
			this.prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
		]);

		return { success: true };
	}

	async resendVerification(actor: AuthUser) {
		const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
		if (!user || !user.isActive) throw new UnauthorizedException("Пользователь недоступен");
		if (user.emailVerifiedAt) return { sent: false, alreadyVerified: true };

		return { sent: await this.sendVerification(user), alreadyVerified: false };
	}

	private async sendVerification(user: User) {
		const { token, hash } = generateToken();
		await this.prisma.$transaction([
			this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
			this.prisma.emailVerificationToken.create({
				data: {
					userId: user.id,
					tokenHash: hash,
					expiresAt: new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
				},
			}),
		]);

		const frontendUrl = (this.configService.get<string>("FRONTEND_URL") || "http://localhost:5173").replace(/\/$/, "");
		const mail = verifyEmailMail(user.fullName, `${frontendUrl}/verify-email/${token}`);
		return this.mail.send({ to: user.email, ...mail });
	}

	async refresh(refreshToken: string) {
		try {
			const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
				secret: this.configService.getOrThrow("JWT_REFRESH_SECRET"),
			});

			if (payload.type !== "refresh") {
				throw new UnauthorizedException("Недействительный токен");
			}

			const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
			if (!user || !user.isActive) {
				throw new UnauthorizedException("Пользователь недоступен");
			}

			return this.issueTokens(user.id, user.email);
		} catch {
			throw new UnauthorizedException("Недействительный токен");
		}
	}

	async me(user: AuthUser) {
		const current = await this.prisma.user.findUnique({ where: { id: user.id } });
		if (!current || !current.isActive) {
			throw new UnauthorizedException("Пользователь недоступен");
		}

		return {
			...toUserDto(current),
			permissions: await this.access.listEffective(current),
		};
	}

	private issueTokens(userId: string, email: string) {
		const accessPayload: JwtPayload = { sub: userId, email, type: "access" };
		const refreshPayload: JwtPayload = { sub: userId, email, type: "refresh" };

		return {
			accessToken: this.jwtService.sign(accessPayload, {
				secret: this.configService.getOrThrow("JWT_ACCESS_SECRET"),
				expiresIn: this.configService.get("JWT_ACCESS_TTL") || "2h",
			}),
			refreshToken: this.jwtService.sign(refreshPayload, {
				secret: this.configService.getOrThrow("JWT_REFRESH_SECRET"),
				expiresIn: this.configService.get("JWT_REFRESH_TTL") || "7d",
			}),
		};
	}
}
