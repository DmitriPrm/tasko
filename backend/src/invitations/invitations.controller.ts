import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationsService } from "./invitations.service";

@ApiTags("invitations")
@ApiBearerAuth()
@Controller()
export class InvitationsController {
	constructor(private readonly invitations: InvitationsService) {}

	// --- из проекта (менеджер) ---

	@Get("projects/:id/invitations")
	list(@CurrentUser() user: AuthUser, @Param("id") projectId: string) {
		return this.invitations.list(user, projectId);
	}

	@Post("projects/:id/invitations")
	@Throttle({ default: { limit: 20, ttl: 60_000 } })
	create(@CurrentUser() user: AuthUser, @Param("id") projectId: string, @Body() dto: CreateInvitationDto) {
		return this.invitations.create(user, projectId, dto);
	}

	@Post("projects/:id/invitations/:invitationId/resend")
	@Throttle({ default: { limit: 20, ttl: 60_000 } })
	resend(
		@CurrentUser() user: AuthUser,
		@Param("id") projectId: string,
		@Param("invitationId") invitationId: string,
	) {
		return this.invitations.resend(user, projectId, invitationId);
	}

	@Delete("projects/:id/invitations/:invitationId")
	revoke(
		@CurrentUser() user: AuthUser,
		@Param("id") projectId: string,
		@Param("invitationId") invitationId: string,
	) {
		return this.invitations.revoke(user, projectId, invitationId);
	}

	// --- приглашённый ---

	@Get("invitations/mine")
	mine(@CurrentUser() user: AuthUser) {
		return this.invitations.listMine(user);
	}

	@Post("invitations/:invitationId/accept")
	acceptById(@CurrentUser() user: AuthUser, @Param("invitationId") invitationId: string) {
		return this.invitations.acceptById(user, invitationId);
	}

	@Post("invitations/:invitationId/decline")
	declineById(@CurrentUser() user: AuthUser, @Param("invitationId") invitationId: string) {
		return this.invitations.declineById(user, invitationId);
	}

	@Public()
	@Get("invitations/by-token/:token")
	@Throttle({ default: { limit: 30, ttl: 60_000 } })
	byToken(@Param("token") token: string) {
		return this.invitations.getByToken(token);
	}

	@Post("invitations/by-token/:token/accept")
	acceptByToken(@CurrentUser() user: AuthUser, @Param("token") token: string) {
		return this.invitations.acceptByToken(user, token);
	}

	@Post("invitations/by-token/:token/decline")
	declineByToken(@CurrentUser() user: AuthUser, @Param("token") token: string) {
		return this.invitations.declineByToken(user, token);
	}
}
