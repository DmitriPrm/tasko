import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ProjectRole, SystemRole } from "@prisma/client";

import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProjectAccessService {
	constructor(private readonly prisma: PrismaService) {}

	async getProjectOrThrow(projectId: string) {
		const project = await this.prisma.project.findUnique({
			where: { id: projectId },
			include: {
				owner: true,
				members: { include: { user: true } },
				tags: { orderBy: { name: "asc" } },
				_count: { select: { tasks: true, members: true } },
			},
		});

		if (!project) {
			throw new NotFoundException("Проект не найден");
		}

		return project;
	}

	async assertCanView(projectId: string, user: AuthUser) {
		if (user.systemRole === SystemRole.ADMIN) {
			return this.getProjectOrThrow(projectId);
		}

		const project = await this.getProjectOrThrow(projectId);
		const isMember = project.members.some((member) => member.userId === user.id);
		if (!isMember) {
			throw new ForbiddenException("Нет доступа к проекту");
		}

		return project;
	}

	async assertCanManage(projectId: string, user: AuthUser) {
		const project = await this.assertCanView(projectId, user);
		if (user.systemRole === SystemRole.ADMIN) {
			return project;
		}

		const membership = project.members.find((member) => member.userId === user.id);
		if (membership?.projectRole !== ProjectRole.MANAGER) {
			throw new ForbiddenException("Недостаточно прав для управления проектом");
		}

		return project;
	}

	async isProjectMember(projectId: string, userId: string) {
		const membership = await this.prisma.projectMember.findUnique({
			where: { projectId_userId: { projectId, userId } },
		});

		return Boolean(membership);
	}
}
