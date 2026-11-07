import { Body, Controller, Get, Param, Post } from "@nestjs/common";
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
}
