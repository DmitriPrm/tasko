import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { ProjectRole, ProjectStatus, SystemRole } from "@prisma/client";

import { AccessService } from "../access/access.service";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AddMemberDto } from "./dto/add-member.dto";
import { CreateProjectDto } from "./dto/create-project.dto";
import { CreateTagDto } from "./dto/create-tag.dto";
import { ProjectsQueryDto } from "./dto/projects-query.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { getProjectFields } from "./project.form";
import { ProjectAccessService } from "./project-access.service";
import { toProjectDto, toTagDto } from "./project.mapper";
import { toUserDto } from "../users/user.mapper";

const TAG_COLORS = ["#2563EB", "#DC2626", "#059669", "#7C3AED", "#D97706", "#0891B2"];

const projectInclude = {
	owner: true,
	members: { include: { user: true } },
	tags: { orderBy: { name: "asc" as const } },
	_count: { select: { tasks: true, members: true } },
};

@Injectable()
export class ProjectsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly projectAccess: ProjectAccessService,
		private readonly access: AccessService,
	) {}

	async list(user: AuthUser, query: ProjectsQueryDto) {
		const page = query.page ?? 1;
		const perPage = query.perPage ?? 20;
		const where = {
			...(user.systemRole === SystemRole.ADMIN ? {} : { members: { some: { userId: user.id } } }),
			...(query.status ? { status: query.status } : { status: { not: ProjectStatus.ARCHIVED } }),
			...(query.search
				? { name: { contains: query.search, mode: "insensitive" as const } }
				: {}),
		};

		const [items, total] = await this.prisma.$transaction([
			this.prisma.project.findMany({
				where,
				include: projectInclude,
				orderBy: { updatedAt: "desc" },
				skip: (page - 1) * perPage,
				take: perPage,
			}),
			this.prisma.project.count({ where }),
		]);

		const favoriteIds = await this.favoriteIds(user.id);

		return {
			items: items.map((item) => toProjectDto(item, favoriteIds.has(item.id))),
			total,
			page,
			perPage,
		};
	}

	async create(user: AuthUser, dto: CreateProjectDto) {
		await this.access.assert(user, "PROJECTS_CREATE");

		const project = await this.prisma.project.create({
			data: {
				name: dto.name,
				description: dto.description,
				status: dto.status ?? ProjectStatus.PLANNED,
				ownerId: user.id,
				plannedStartAt: dto.plannedStartAt ? new Date(dto.plannedStartAt) : null,
				plannedEndAt: dto.plannedEndAt ? new Date(dto.plannedEndAt) : null,
				members: {
					create: {
						userId: user.id,
						projectRole: ProjectRole.MANAGER,
					},
				},
			},
			include: projectInclude,
		});

		return toProjectDto(project, false);
	}

	async getById(user: AuthUser, projectId: string) {
		const project = await this.projectAccess.assertCanView(projectId, user);
		const favoriteIds = await this.favoriteIds(user.id);
		return toProjectDto(project, favoriteIds.has(project.id));
	}

	async update(user: AuthUser, projectId: string, dto: UpdateProjectDto) {
		await this.access.assert(user, "PROJECTS_EDIT");
		await this.projectAccess.assertCanManage(projectId, user);

		const project = await this.prisma.project.update({
			where: { id: projectId },
			data: {
				name: dto.name,
				description: dto.description,
				status: dto.status,
				plannedStartAt:
					dto.plannedStartAt === undefined ? undefined : dto.plannedStartAt ? new Date(dto.plannedStartAt) : null,
				plannedEndAt:
					dto.plannedEndAt === undefined ? undefined : dto.plannedEndAt ? new Date(dto.plannedEndAt) : null,
			},
			include: projectInclude,
		});

		const favoriteIds = await this.favoriteIds(user.id);
		return toProjectDto(project, favoriteIds.has(project.id));
	}

	async archive(user: AuthUser, projectId: string) {
		await this.access.assert(user, "PROJECTS_ARCHIVE");
		await this.projectAccess.assertCanManage(projectId, user);

		const project = await this.prisma.project.update({
			where: { id: projectId },
			data: { status: ProjectStatus.ARCHIVED },
			include: projectInclude,
		});

		const favoriteIds = await this.favoriteIds(user.id);
		return toProjectDto(project, favoriteIds.has(project.id));
	}

	/** Полное удаление проекта: задачи, колонки, теги, участники и приглашения удаляются каскадно */
	async remove(user: AuthUser, projectId: string) {
		await this.access.assert(user, "PROJECTS_ARCHIVE");
		await this.projectAccess.assertCanManage(projectId, user);
		await this.prisma.project.delete({ where: { id: projectId } });
		return { success: true };
	}

	async listFavorites(user: AuthUser) {
		const favorites = await this.prisma.projectFavorite.findMany({
			where: {
				userId: user.id,
				project: {
					status: { not: ProjectStatus.ARCHIVED },
					...(user.systemRole === SystemRole.ADMIN ? {} : { members: { some: { userId: user.id } } }),
				},
			},
			include: { project: { include: projectInclude } },
			orderBy: { createdAt: "desc" },
		});

		return favorites.map((item) => toProjectDto(item.project, true));
	}

	async addFavorite(user: AuthUser, projectId: string) {
		await this.projectAccess.assertCanView(projectId, user);
		await this.prisma.projectFavorite.upsert({
			where: { userId_projectId: { userId: user.id, projectId } },
			update: {},
			create: { userId: user.id, projectId },
		});
		return this.getById(user, projectId);
	}

	async removeFavorite(user: AuthUser, projectId: string) {
		await this.projectAccess.assertCanView(projectId, user);
		await this.prisma.projectFavorite.deleteMany({
			where: { userId: user.id, projectId },
		});
		return this.getById(user, projectId);
	}

	async listTags(user: AuthUser, projectId: string) {
		await this.projectAccess.assertCanView(projectId, user);
		const tags = await this.prisma.tag.findMany({
			where: { projectId },
			orderBy: { name: "asc" },
		});
		return tags.map(toTagDto);
	}

	async createTag(user: AuthUser, projectId: string, dto: CreateTagDto) {
		await this.projectAccess.assertCanView(projectId, user);
		const name = dto.name.trim();
		if (!name) {
			throw new BadRequestException("Название тега не может быть пустым");
		}

		const existing = await this.prisma.tag.findUnique({
			where: { projectId_name: { projectId, name } },
		});
		if (existing) {
			throw new ConflictException("Тег с таким названием уже есть в проекте");
		}

		const color = dto.color || TAG_COLORS[hashName(name) % TAG_COLORS.length];
		const tag = await this.prisma.tag.create({ data: { projectId, name, color } });
		return toTagDto(tag);
	}

	async removeTag(user: AuthUser, projectId: string, tagId: string) {
		await this.projectAccess.assertCanManage(projectId, user);
		const removed = await this.prisma.tag.deleteMany({ where: { id: tagId, projectId } });
		if (!removed.count) {
			throw new NotFoundException("Тег не найден");
		}
		return { success: true };
	}

	private async favoriteIds(userId: string) {
		const favorites = await this.prisma.projectFavorite.findMany({
			where: { userId },
			select: { projectId: true },
		});
		return new Set(favorites.map((item) => item.projectId));
	}

	async listMembers(user: AuthUser, projectId: string) {
		const project = await this.projectAccess.assertCanView(projectId, user);
		return toProjectDto(project).members ?? [];
	}

	async addMember(user: AuthUser, projectId: string, dto: AddMemberDto) {
		await this.access.assert(user, "PROJECTS_MANAGE_MEMBERS");
		await this.projectAccess.assertCanManage(projectId, user);

		const target = await this.prisma.user.findUnique({ where: { id: dto.userId } });
		if (!target || !target.isActive) {
			throw new NotFoundException("Пользователь не найден или заблокирован");
		}

		const existing = await this.prisma.projectMember.findUnique({
			where: { projectId_userId: { projectId, userId: dto.userId } },
		});
		if (existing) {
			throw new BadRequestException("Пользователь уже состоит в проекте");
		}

		const member = await this.prisma.projectMember.create({
			data: {
				projectId,
				userId: dto.userId,
				projectRole: dto.projectRole,
			},
			include: { user: true },
		});

		return {
			id: member.id,
			projectId: member.projectId,
			userId: member.userId,
			projectRole: member.projectRole,
			joinedAt: member.joinedAt.toISOString(),
			user: toUserDto(member.user),
		};
	}

	getCreateForm() {
		return { fields: getProjectFields() };
	}

	async getEditForm(user: AuthUser, projectId: string) {
		const project = await this.projectAccess.assertCanManage(projectId, user);
		return { fields: getProjectFields(project) };
	}

	async removeMember(user: AuthUser, projectId: string, memberUserId: string) {
		await this.access.assert(user, "PROJECTS_MANAGE_MEMBERS");
		const project = await this.projectAccess.assertCanManage(projectId, user);
		if (project.ownerId === memberUserId) {
			throw new BadRequestException("Нельзя удалить владельца проекта");
		}

		const membership = project.members.find((member) => member.userId === memberUserId);
		if (!membership) {
			throw new NotFoundException("Участник не найден");
		}

		// Исполнитель задачи — только участник проекта: снимаем его с задач при удалении
		await this.prisma.$transaction([
			this.prisma.task.updateMany({
				where: { projectId, assigneeId: memberUserId },
				data: { assigneeId: null },
			}),
			this.prisma.taskCoAssignee.deleteMany({
				where: { userId: memberUserId, task: { projectId } },
			}),
			this.prisma.projectMember.delete({
				where: { projectId_userId: { projectId, userId: memberUserId } },
			}),
		]);

		return { success: true };
	}
}

function hashName(value: string) {
	return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}
