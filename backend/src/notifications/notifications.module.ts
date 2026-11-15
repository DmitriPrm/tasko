import { Module } from "@nestjs/common";

import { NotificationsController } from "./notifications.controller";
import { DeadlineRemindersService } from "./deadline-reminders.service";
import { NotificationsService } from "./notifications.service";
import { RiskAlertsService } from "./risk-alerts.service";

@Module({
	controllers: [NotificationsController],
	providers: [NotificationsService, DeadlineRemindersService, RiskAlertsService],
	exports: [NotificationsService, RiskAlertsService],
})
export class NotificationsModule {}
