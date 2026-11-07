import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AccessModule } from "./access/access.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AvatarsModule } from "./avatars/avatars.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { CommentsModule } from "./comments/comments.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { InvitationsModule } from "./invitations/invitations.module";
import { MailModule } from "./mail/mail.module";
import { HealthController } from "./health/health.controller";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";
import { SettingsModule } from "./settings/settings.module";
import { TableLayoutsModule } from "./table-layouts/table-layouts.module";
import { TasksModule } from "./tasks/tasks.module";
import { UsersModule } from "./users/users.module";

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
		PrismaModule,
		MailModule,
		AccessModule,
		AuthModule,
		UsersModule,
		InvitationsModule,
		ProjectsModule,
		TasksModule,
		TableLayoutsModule,
		CommentsModule,
		NotificationsModule,
		AnalyticsModule,
		AvatarsModule,
		DashboardModule,
		SettingsModule,
	],
	controllers: [HealthController],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
	],
})
export class AppModule {}
