import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";

@ApiTags("comments")
@ApiBearerAuth()
@Controller("tasks/:id/comments")
export class CommentsController {
	constructor(private readonly commentsService: CommentsService) {}

	@Get()
	list(@CurrentUser() user: AuthUser, @Param("id") taskId: string) {
		return this.commentsService.list(user, taskId);
	}

	@Post()
	create(@CurrentUser() user: AuthUser, @Param("id") taskId: string, @Body() dto: CreateCommentDto) {
		return this.commentsService.create(user, taskId, dto);
	}

	@Patch(":commentId")
	update(
		@CurrentUser() user: AuthUser,
		@Param("id") taskId: string,
		@Param("commentId") commentId: string,
		@Body() dto: CreateCommentDto,
	) {
		return this.commentsService.update(user, taskId, commentId, dto);
	}

	@Delete(":commentId")
	remove(@CurrentUser() user: AuthUser, @Param("id") taskId: string, @Param("commentId") commentId: string) {
		return this.commentsService.remove(user, taskId, commentId);
	}
}
