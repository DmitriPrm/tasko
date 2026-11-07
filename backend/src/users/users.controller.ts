import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateProfileDto, UpdateRightsDto } from "./dto/update-profile.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersQueryDto } from "./dto/users-query.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	list(@CurrentUser() user: AuthUser, @Query() query: UsersQueryDto) {
		return this.usersService.list(user, query);
	}

	@Get("create")
	createForm(@CurrentUser() user: AuthUser) {
		return this.usersService.getCreateForm(user);
	}

	@Post()
	create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
		return this.usersService.create(user, dto);
	}

	@Get(":id/profile")
	getProfile(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.usersService.getProfile(user, id);
	}

	@Patch(":id/profile")
	updateProfile(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateProfileDto) {
		return this.usersService.updateProfile(user, id, dto);
	}

	@Post(":id/avatar")
	@UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
	updateAvatar(
		@CurrentUser() user: AuthUser,
		@Param("id") id: string,
		@UploadedFile() file?: { buffer: Buffer; mimetype: string },
	) {
		return this.usersService.updateAvatar(user, id, file);
	}

	@Patch(":id/rights")
	updateRights(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateRightsDto) {
		return this.usersService.updateRights(user, id, dto);
	}

	@Get(":id")
	getById(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.usersService.getById(user, id);
	}

	@Patch(":id")
	update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateUserDto) {
		return this.usersService.update(user, id, dto);
	}
}
