import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { AddMemberDto } from "./dto/add-member.dto";
import { CreateColumnDto } from "./dto/create-column.dto";
import { DeleteColumnQueryDto } from "./dto/delete-column-query.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";
import { CreateProjectDto } from "./dto/create-project.dto";
import { CreateTagDto } from "./dto/create-tag.dto";
import { ProjectsQueryDto } from "./dto/projects-query.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectColumnsService } from "./project-columns.service";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
export class ProjectsController {
	constructor(
		private readonly projectsService: ProjectsService,
		private readonly columnsService: ProjectColumnsService,
	) {}

	@Get()
	list(@CurrentUser() user: AuthUser, @Query() query: ProjectsQueryDto) {
		return this.projectsService.list(user, query);
	}

	@Get("favorites")
	listFavorites(@CurrentUser() user: AuthUser) {
		return this.projectsService.listFavorites(user);
	}

	@Get("create")
	createForm() {
		return this.projectsService.getCreateForm();
	}

	@Post()
	create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
		return this.projectsService.create(user, dto);
	}

	@Get(":id/edit")
	editForm(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.projectsService.getEditForm(user, id);
	}

	@Get(":id")
	getById(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.projectsService.getById(user, id);
	}

	@Patch(":id")
	update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateProjectDto) {
		return this.projectsService.update(user, id, dto);
	}

	@Delete(":id")
	remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.projectsService.remove(user, id);
	}

	@Post(":id/archive")
	archive(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.projectsService.archive(user, id);
	}

	@Post(":id/favorite")
	addFavorite(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.projectsService.addFavorite(user, id);
	}

	@Delete(":id/favorite")
	removeFavorite(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.projectsService.removeFavorite(user, id);
	}

	@Get(":id/tags")
	listTags(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.projectsService.listTags(user, id);
	}

	@Post(":id/tags")
	createTag(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CreateTagDto) {
		return this.projectsService.createTag(user, id, dto);
	}

	@Delete(":id/tags/:tagId")
	removeTag(@CurrentUser() user: AuthUser, @Param("id") id: string, @Param("tagId") tagId: string) {
		return this.projectsService.removeTag(user, id, tagId);
	}

	@Get(":id/columns")
	listColumns(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.columnsService.list(user, id);
	}

	@Post(":id/columns")
	createColumn(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: CreateColumnDto) {
		return this.columnsService.create(user, id, dto);
	}

	@Patch(":id/columns/:columnId")
	updateColumn(
		@CurrentUser() user: AuthUser,
		@Param("id") id: string,
		@Param("columnId") columnId: string,
		@Body() dto: UpdateColumnDto,
	) {
		return this.columnsService.update(user, id, columnId, dto);
	}

	@Delete(":id/columns/:columnId")
	removeColumn(
		@CurrentUser() user: AuthUser,
		@Param("id") id: string,
		@Param("columnId") columnId: string,
		@Query() query: DeleteColumnQueryDto,
	) {
		return this.columnsService.remove(user, id, columnId, query);
	}

	@Get(":id/members")
	listMembers(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.projectsService.listMembers(user, id);
	}

	@Post(":id/members")
	addMember(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: AddMemberDto) {
		return this.projectsService.addMember(user, id, dto);
	}

	@Delete(":id/members/:userId")
	removeMember(
		@CurrentUser() user: AuthUser,
		@Param("id") id: string,
		@Param("userId") userId: string,
	) {
		return this.projectsService.removeMember(user, id, userId);
	}
}
