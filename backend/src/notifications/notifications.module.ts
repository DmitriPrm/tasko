import { Module } from "@nestjs/common";

import { NotificationsController } from "./notifications.controller";
import { DeadlineRemindersService } from "./deadline-reminders.service";
import { NotificationsService } from "./notifications.service";

@Module({
	controllers: [NotificationsController],
	providers: [NotificationsService, DeadlineRemindersService],
	exports: [NotificationsService],
})
export class NotificationsModule {}
