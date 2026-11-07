import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

import { AccessService } from "../access/access.service";
import { saveGeneratedAvatar, saveUploadedAvatar } from "../common/avatar/files";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateProfileDto, UpdateRightsDto } from "./dto/update-profile.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersQueryDto } from "./dto/users-query.dto";
import { toSectionDto } from "./profile-sections.service";
import { getUserFields } from "./user.form";
import { toUserDto } from "./user.mapper";

@Injectable()
export class UsersService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly access: AccessService,
	) {}

	async list(actor: AuthUser, query: UsersQueryDto) {
		// Список всех пользователей системы виден только администратору
		if (actor.systemRole !== SystemRole.ADMIN) throw new ForbiddenException("Недостаточно прав");
		await this.access.assert(actor, "USERS_VIEW");
		const page = query.page ?? 1;
		const perPage = query.perPage ?? 20;
		const where = {
			...(query.systemRole ? { systemRole: query.systemRole } : {}),
			...(query.search
				? {
						OR: [
							{ fullName: { contains: query.search, mode: "insensitive" as const } },
							{ email: { contains: query.search, mode: "insensitive" as const } },
						],
					}
				: {}),
		};

		const [items, total] = await this.prisma.$transaction([
			this.prisma.user.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * perPage,
				take: perPage,
			}),
			this.prisma.user.count({ where }),
		]);

		return {
			items: items.map(toUserDto),
			total,
			page,
			perPage,
		};
	}

	async create(actor: AuthUser, dto: CreateUserDto) {
		await this.access.assert(actor, "USERS_CREATE");
		const email = dto.email.toLowerCase();
		const existing = await this.prisma.user.findUnique({ where: { email } });
		if (existing) {
			throw new ConflictException("Пользователь с таким email уже существует");
		}

		const user = await this.prisma.user.create({
			data: {
				email,
				fullName: dto.fullName,
				passwordHash: await bcrypt.hash(dto.password, 10),
				systemRole: dto.systemRole,
				isActive: dto.isActive ?? true,
				emailVerifiedAt: new Date(),
			},
		});
		const avatarFile = saveGeneratedAvatar(user.id);
		const saved = await this.prisma.user.update({
			where: { id: user.id },
			data: { avatarFile },
		});

		return toUserDto(saved);
	}

	async getById(actor: AuthUser, id: string) {
		const user = await this.ensureExists(id);
		await this.assertCanSee(actor, id);
		return toUserDto(user);
	}

	async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
		if (dto.isActive !== undefined) await this.access.assert(actor, "USERS_BLOCK");
		if (dto.systemRole !== undefined || dto.fullName !== undefined || dto.password !== undefined) {
			await this.access.assert(actor, "USERS_CREATE");
		}
		await this.ensureExists(id);

		if (actor.id === id && (dto.isActive === false || (dto.systemRole && dto.systemRole !== actor.systemRole))) {
			throw new ForbiddenException("Нельзя заблокировать себя или изменить собственную роль");
		}

		const user = await this.prisma.user.update({
			where: { id },
			data: {
				fullName: dto.fullName,
				systemRole: dto.systemRole,
				isActive: dto.isActive,
				...(dto.password ? { passwordHash: await bcrypt.hash(dto.password, 10) } : {}),
			},
		});

		return toUserDto(user);
	}

	async getCreateForm(actor: AuthUser) {
		await this.access.assert(actor, "USERS_CREATE");
		return { fields: getUserFields() };
	}

	async getProfile(actor: AuthUser, userId: string) {
		await this.access.assert(actor, "PROFILE_VIEW");
		const user = await this.ensureExists(userId);
		await this.assertCanSee(actor, userId);
		const [sections, permissions] = await Promise.all([
			this.prisma.profileSection.findMany({
				where: { userId },
				orderBy: { position: "asc" },
				include: { fields: { orderBy: { position: "asc" } } },
			}),
			this.access.listEffective(user),
		]);
		const isSelf = actor.id === user.id;

		return {
			...toUserDto(user),
			canEdit: isSelf
				? await this.access.has(actor, "PROFILE_EDIT_OWN")
				: await this.access.has(actor, "PROFILE_EDIT_OTHERS"),
			canEditRights: !isSelf && (await this.access.has(actor, "PROFILE_EDIT_RIGHTS")),
			permissions,
			sections: sections.map(toSectionDto),
		};
	}

	async updateProfile(actor: AuthUser, userId: string, dto: UpdateProfileDto) {
		const profile = await this.getProfile(actor, userId);
		if (!profile.canEdit) throw new ForbiddenException("Недостаточно прав для изменения профиля");

		await this.prisma.user.update({
			where: { id: userId },
			data: { fullName: dto.fullName.trim() },
		});

		return this.getProfile(actor, userId);
	}

	async updateAvatar(actor: AuthUser, userId: string, file?: { buffer: Buffer; mimetype: string }) {
		const profile = await this.getProfile(actor, userId);
		if (!profile.canEdit) throw new ForbiddenException("Недостаточно прав для изменения профиля");
		if (!file?.buffer?.length) throw new BadRequestException("Выберите изображение");

		const avatarFile = saveUploadedAvatar(userId, file.buffer, file.mimetype);
		if (!avatarFile) throw new BadRequestException("Можно загрузить PNG, JPEG или WEBP");

		await this.prisma.user.update({
			where: { id: userId },
			data: { avatarFile },
		});

		return this.getProfile(actor, userId);
	}

	async updateRights(actor: AuthUser, userId: string, dto: UpdateRightsDto) {
		if (actor.id === userId) throw new ForbiddenException("Нельзя менять собственные права");
		await this.access.assert(actor, "PROFILE_EDIT_RIGHTS");
		await this.ensureExists(userId);

		await this.prisma.user.update({
			where: { id: userId },
			data: { systemRole: dto.systemRole },
		});
		await this.access.saveUserPermissions(userId, dto.permissions);

		return this.getProfile(actor, userId);
	}

	/** Свой профиль, профиль соучастника по проекту или любой (для администратора). */
	private async assertCanSee(actor: AuthUser, userId: string) {
		if (actor.id === userId || actor.systemRole === SystemRole.ADMIN) return;

		const shared = await this.prisma.projectMember.findFirst({
			where: { userId, project: { members: { some: { userId: actor.id } } } },
			select: { id: true },
		});
		if (!shared) throw new ForbiddenException("Нет доступа к профилю этого пользователя");
	}

	private async ensureExists(id: string) {
		const user = await this.prisma.user.findUnique({ where: { id } });
		if (!user) {
			throw new NotFoundException("Пользователь не найден");
		}

		return user;
	}
}
