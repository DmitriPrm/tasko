import { Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
	constructor(private readonly notificationsService: NotificationsService) {}

	@Get()
	list(@CurrentUser() user: AuthUser) {
		return this.notificationsService.list(user);
	}

	@Get("unread-count")
	unreadCount(@CurrentUser() user: AuthUser) {
		return this.notificationsService.unreadCount(user);
	}

	@Patch("read-all")
	markAllRead(@CurrentUser() user: AuthUser) {
		return this.notificationsService.markAllRead(user);
	}

	@Patch(":id/read")
	markRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
		return this.notificationsService.markRead(user, id);
	}
}
