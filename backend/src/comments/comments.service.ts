import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Comment, ProjectRole, SystemRole, User } from "@prisma/client";

import { AccessService } from "../access/access.service";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessService } from "../projects/project-access.service";
import { toUserDto } from "../users/user.mapper";
import { CreateCommentDto } from "./dto/create-comment.dto";

/** Правка позже этого срока после создания показывается как «изменён» */
const EDIT_MARK_MS = 1000;

type Moderation = { canModerate: boolean };

@Injectable()
export class CommentsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly projectAccess: ProjectAccessService,
		private readonly access: AccessService,
	) {}

	async list(user: AuthUser, taskId: string) {
		const moderation = await this.openTask(user, taskId);

		const comments = await this.prisma.comment.findMany({
			where: { taskId },
			include: { author: true },
			orderBy: { createdAt: "asc" },
		});

		return comments.map((comment) => this.toDto(comment, user, moderation));
	}

	async create(user: AuthUser, taskId: string, dto: CreateCommentDto) {
		await this.access.assert(user, "COMMENTS_CREATE");
		const moderation = await this.openTask(user, taskId);

		const comment = await this.prisma.comment.create({
			data: {
				taskId,
				authorId: user.id,
				body: dto.body,
			},
			include: { author: true },
		});

		return this.toDto(comment, user, moderation);
	}

	/** Исправить текст может только автор комментария */
	async update(user: AuthUser, taskId: string, commentId: string, dto: CreateCommentDto) {
		const moderation = await this.openTask(user, taskId);
		const comment = await this.findComment(taskId, commentId);
		if (comment.authorId !== user.id) {
			throw new ForbiddenException("Изменить комментарий может только его автор");
		}

		const updated = await this.prisma.comment.update({
			where: { id: commentId },
			data: { body: dto.body },
			include: { author: true },
		});
		return this.toDto(updated, user, moderation);
	}

	/** Удалить может автор, а также руководитель проекта и администратор (модерация) */
	async remove(user: AuthUser, taskId: string, commentId: string) {
		const moderation = await this.openTask(user, taskId);
		const comment = await this.findComment(taskId, commentId);
		if (comment.authorId !== user.id && !moderation.canModerate) {
			throw new ForbiddenException("Удалить комментарий может автор или руководитель проекта");
		}

		await this.prisma.comment.delete({ where: { id: commentId } });
		return { success: true };
	}

	/** Задача существует и пользователь её видит; заодно узнаём, может ли он модерировать комментарии */
	private async openTask(user: AuthUser, taskId: string): Promise<Moderation> {
		const task = await this.prisma.task.findUnique({ where: { id: taskId } });
		if (!task) {
			throw new NotFoundException("Задача не найдена");
		}

		const project = await this.projectAccess.assertCanView(task.projectId, user);
		const membership = project?.members?.find((member: { userId: string }) => member.userId === user.id) as
			| { projectRole: ProjectRole }
			| undefined;
		return {
			canModerate: user.systemRole === SystemRole.ADMIN || membership?.projectRole === ProjectRole.MANAGER,
		};
	}

	private async findComment(taskId: string, commentId: string) {
		const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
		if (!comment || comment.taskId !== taskId) {
			throw new NotFoundException("Комментарий не найден");
		}
		return comment;
	}

	private toDto(comment: Comment & { author: User }, user: AuthUser, moderation: Moderation) {
		const isAuthor = comment.authorId === user.id;
		return {
			id: comment.id,
			taskId: comment.taskId,
			authorId: comment.authorId,
			body: comment.body,
			createdAt: comment.createdAt.toISOString(),
			updatedAt: comment.updatedAt.toISOString(),
			edited: comment.updatedAt.getTime() - comment.createdAt.getTime() > EDIT_MARK_MS,
			canEdit: isAuthor,
			canDelete: isAuthor || moderation.canModerate,
			author: toUserDto(comment.author),
		};
	}
}
