import {
	BadRequestException,
	ForbiddenException,
	GoneException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InvitationStatus, Prisma, ProjectInvitation, User } from "@prisma/client";

import { AccessService } from "../access/access.service";
import { AuthUser } from "../auth/auth.types";
import { generateToken, hashToken } from "../common/security/tokens";
import { MailService } from "../mail/mail.service";
import { invitationMail } from "../mail/mail.templates";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessService } from "../projects/project-access.service";
import { CreateInvitationDto } from "./dto/create-invitation.dto";

export const INVITATION_TTL_DAYS = 7;

const invitationInclude = {
	project: { select: { id: true, name: true } },
	invitedBy: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.ProjectInvitationInclude;

type InvitationWithRelations = Prisma.ProjectInvitationGetPayload<{ include: typeof invitationInclude }>;

@Injectable()
export class InvitationsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly access: AccessService,
		private readonly projectAccess: ProjectAccessService,
		private readonly mail: MailService,
		private readonly notifications: NotificationsService,
		private readonly config: ConfigService,
	) {}

	// ---------- управление из проекта ----------

	async list(actor: AuthUser, projectId: string) {
		await this.projectAccess.assertCanManage(projectId, actor);
		const items = await this.prisma.projectInvitation.findMany({
			where: { projectId, status: InvitationStatus.PENDING },
			include: invitationInclude,
			orderBy: { createdAt: "desc" },
		});

		return items.map((item) => this.toDto(item));
	}

	async create(actor: AuthUser, projectId: string, dto: CreateInvitationDto) {
		await this.access.assert(actor, "PROJECTS_MANAGE_MEMBERS");
		const project = await this.projectAccess.assertCanManage(projectId, actor);
		const email = dto.email.trim().toLowerCase();

		const invitee = await this.prisma.user.findUnique({ where: { email } });
		if (invitee && !invitee.isActive) {
			throw new BadRequestException("Пользователь заблокирован");
		}
		if (invitee && project.members.some((member) => member.userId === invitee.id)) {
			throw new BadRequestException("Пользователь уже состоит в проекте");
		}

		const { token, hash } = generateToken();
		const expiresAt = this.expiry();
		const pending = await this.prisma.projectInvitation.findFirst({
			where: { projectId, email, status: InvitationStatus.PENDING },
		});

		const invitation = pending
			? await this.prisma.projectInvitation.update({
					where: { id: pending.id },
					data: { tokenHash: hash, expiresAt, projectRole: dto.projectRole, invitedById: actor.id },
					include: invitationInclude,
				})
			: await this.prisma.projectInvitation.create({
					data: {
						projectId,
						email,
						projectRole: dto.projectRole,
						tokenHash: hash,
						expiresAt,
						invitedById: actor.id,
						inviteeId: invitee?.id ?? null,
					},
					include: invitationInclude,
				});

		return this.deliver(invitation, token, invitee);
	}

	async resend(actor: AuthUser, projectId: string, invitationId: string) {
		await this.projectAccess.assertCanManage(projectId, actor);
		const existing = await this.prisma.projectInvitation.findFirst({
			where: { id: invitationId, projectId, status: InvitationStatus.PENDING },
		});
		if (!existing) throw new NotFoundException("Приглашение не найдено");

		const { token, hash } = generateToken();
		const invitation = await this.prisma.projectInvitation.update({
			where: { id: existing.id },
			data: { tokenHash: hash, expiresAt: this.expiry(), invitedById: actor.id },
			include: invitationInclude,
		});
		const invitee = await this.prisma.user.findUnique({ where: { email: invitation.email } });

		return this.deliver(invitation, token, invitee);
	}

	async revoke(actor: AuthUser, projectId: string, invitationId: string) {
		await this.projectAccess.assertCanManage(projectId, actor);
		const result = await this.prisma.projectInvitation.updateMany({
			where: { id: invitationId, projectId, status: InvitationStatus.PENDING },
			data: { status: InvitationStatus.REVOKED, respondedAt: new Date() },
		});
		if (!result.count) throw new NotFoundException("Приглашение не найдено");

		return { success: true };
	}

	// ---------- ответ на приглашение ----------

	/** Публично: данные приглашения по ссылке (токен знает только адресат). */
	async getByToken(token: string) {
		const invitation = await this.prisma.projectInvitation.findUnique({
			where: { tokenHash: hashToken(token) },
			include: invitationInclude,
		});
		if (!invitation) throw new NotFoundException("Приглашение не найдено");

		const registered = await this.prisma.user.count({ where: { email: invitation.email } });
		return { ...this.toDto(invitation), userExists: registered > 0 };
	}

	async acceptByToken(actor: AuthUser, token: string) {
		const invitation = await this.requireActiveByToken(token);
		const user = await this.requireAddressee(actor, invitation);
		return this.accept(invitation, user.id);
	}

	async declineByToken(actor: AuthUser, token: string) {
		const invitation = await this.requireActiveByToken(token);
		await this.requireAddressee(actor, invitation);
		return this.decline(invitation, actor.id);
	}

	async listMine(actor: AuthUser) {
		const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
		if (!user?.emailVerifiedAt) return [];

		const items = await this.prisma.projectInvitation.findMany({
			where: {
				email: user.email.toLowerCase(),
				status: InvitationStatus.PENDING,
				expiresAt: { gt: new Date() },
			},
			include: invitationInclude,
			orderBy: { createdAt: "desc" },
		});

		return items.map((item) => this.toDto(item));
	}

	async acceptById(actor: AuthUser, id: string) {
		const invitation = await this.requireActiveById(id);
		const user = await this.requireAddressee(actor, invitation);
		return this.accept(invitation, user.id);
	}

	async declineById(actor: AuthUser, id: string) {
		const invitation = await this.requireActiveById(id);
		await this.requireAddressee(actor, invitation);
		return this.decline(invitation, actor.id);
	}

	// ---------- для регистрации ----------

	/** Действующее приглашение по токену либо null. */
	async findActiveByToken(token: string) {
		const invitation = await this.prisma.projectInvitation.findUnique({
			where: { tokenHash: hashToken(token) },
		});
		if (!invitation || invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
			return null;
		}

		return invitation;
	}

	async acceptForUser(invitation: ProjectInvitation, userId: string) {
		const full = await this.prisma.projectInvitation.findUnique({
			where: { id: invitation.id },
			include: invitationInclude,
		});
		if (!full) return null;

		return this.accept(full, userId);
	}

	// ---------- внутреннее ----------

	private async accept(invitation: InvitationWithRelations | ProjectInvitation, userId: string) {
		await this.prisma.$transaction(async (tx) => {
			// Условное обновление защищает от двойного принятия при параллельных запросах
			const claimed = await tx.projectInvitation.updateMany({
				where: { id: invitation.id, status: InvitationStatus.PENDING },
				data: { status: InvitationStatus.ACCEPTED, respondedAt: new Date(), inviteeId: userId },
			});
			if (!claimed.count) throw new GoneException("Приглашение уже обработано");

			await tx.projectMember.upsert({
				where: { projectId_userId: { projectId: invitation.projectId, userId } },
				update: {},
				create: { projectId: invitation.projectId, userId, projectRole: invitation.projectRole },
			});
		});

		return { success: true, projectId: invitation.projectId };
	}

	private async decline(invitation: ProjectInvitation, userId: string) {
		const result = await this.prisma.projectInvitation.updateMany({
			where: { id: invitation.id, status: InvitationStatus.PENDING },
			data: { status: InvitationStatus.DECLINED, respondedAt: new Date(), inviteeId: userId },
		});
		if (!result.count) throw new GoneException("Приглашение уже обработано");

		return { success: true };
	}

	private async requireActiveByToken(token: string) {
		const invitation = await this.prisma.projectInvitation.findUnique({
			where: { tokenHash: hashToken(token) },
		});
		return this.ensureActive(invitation);
	}

	private async requireActiveById(id: string) {
		const invitation = await this.prisma.projectInvitation.findUnique({ where: { id } });
		return this.ensureActive(invitation);
	}

	private ensureActive(invitation: ProjectInvitation | null) {
		if (!invitation) throw new NotFoundException("Приглашение не найдено");
		if (invitation.status !== InvitationStatus.PENDING) {
			throw new GoneException("Приглашение уже обработано или отозвано");
		}
		if (invitation.expiresAt < new Date()) {
			throw new GoneException("Срок приглашения истёк, попросите отправить новое");
		}

		return invitation;
	}

	/** Отвечать на приглашение может только владелец адреса с подтверждённой почтой. */
	private async requireAddressee(actor: AuthUser, invitation: ProjectInvitation): Promise<User> {
		const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
		if (!user || !user.isActive) throw new ForbiddenException("Пользователь недоступен");
		if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
			throw new ForbiddenException(`Приглашение отправлено на ${invitation.email}. Войдите под этим адресом`);
		}
		if (!user.emailVerifiedAt) {
			throw new ForbiddenException("Сначала подтвердите email по ссылке из письма");
		}

		return user;
	}

	private async deliver(invitation: InvitationWithRelations, token: string, invitee: User | null) {
		const inviteUrl = `${this.frontendUrl()}/invite/${token}`;
		const mail = invitationMail(invitation.invitedBy.fullName, invitation.project.name, inviteUrl, INVITATION_TTL_DAYS);
		const emailSent = await this.mail.send({ to: invitation.email, ...mail });

		if (invitee?.emailVerifiedAt) {
			await this.notifications.notifyProjectInvitation(
				invitee.id,
				invitation.invitedBy.fullName,
				invitation.project.name,
			);
		}

		// inviteUrl видит только тот, кто управляет проектом: на случай, если письмо не дошло
		return { ...this.toDto(invitation), emailSent, inviteUrl };
	}

	private toDto(invitation: InvitationWithRelations) {
		const expired = invitation.status === InvitationStatus.PENDING && invitation.expiresAt < new Date();
		return {
			id: invitation.id,
			email: invitation.email,
			projectRole: invitation.projectRole,
			status: expired ? "EXPIRED" : invitation.status,
			expiresAt: invitation.expiresAt.toISOString(),
			createdAt: invitation.createdAt.toISOString(),
			project: invitation.project,
			invitedBy: { id: invitation.invitedBy.id, fullName: invitation.invitedBy.fullName },
		};
	}

	private expiry() {
		return new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
	}

	private frontendUrl() {
		return (this.config.get<string>("FRONTEND_URL") || "http://localhost:5173").replace(/\/$/, "");
	}
}
