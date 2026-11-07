import { Injectable, NotFoundException } from "@nestjs/common";

import { AccessService } from "../access/access.service";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessService } from "../projects/project-access.service";
import { toUserDto } from "../users/user.mapper";
import { CreateCommentDto } from "./dto/create-comment.dto";

@Injectable()
export class CommentsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly projectAccess: ProjectAccessService,
		private readonly access: AccessService,
	) {}

	async list(user: AuthUser, taskId: string) {
		const task = await this.prisma.task.findUnique({ where: { id: taskId } });
		if (!task) {
			throw new NotFoundException("Задача не найдена");
		}

		await this.projectAccess.assertCanView(task.projectId, user);

		const comments = await this.prisma.comment.findMany({
			where: { taskId },
			include: { author: true },
			orderBy: { createdAt: "asc" },
		});

		return comments.map((comment) => ({
			id: comment.id,
			taskId: comment.taskId,
			authorId: comment.authorId,
			body: comment.body,
			createdAt: comment.createdAt.toISOString(),
			updatedAt: comment.updatedAt.toISOString(),
			author: toUserDto(comment.author),
		}));
	}

	async create(user: AuthUser, taskId: string, dto: CreateCommentDto) {
		await this.access.assert(user, "COMMENTS_CREATE");
		const task = await this.prisma.task.findUnique({ where: { id: taskId } });
		if (!task) {
			throw new NotFoundException("Задача не найдена");
		}

		await this.projectAccess.assertCanView(task.projectId, user);

		const comment = await this.prisma.comment.create({
			data: {
				taskId,
				authorId: user.id,
				body: dto.body,
			},
			include: { author: true },
		});

		return {
			id: comment.id,
			taskId: comment.taskId,
			authorId: comment.authorId,
			body: comment.body,
			createdAt: comment.createdAt.toISOString(),
			updatedAt: comment.updatedAt.toISOString(),
			author: toUserDto(comment.author),
		};
	}
}
