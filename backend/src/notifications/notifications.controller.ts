import { Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { NotificationsQueryDto } from "./dto/notifications-query.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
	constructor(private readonly notificationsService: NotificationsService) {}

	@Get()
	list(@CurrentUser() user: AuthUser, @Query() query: NotificationsQueryDto) {
		return this.notificationsService.list(user, query);
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
