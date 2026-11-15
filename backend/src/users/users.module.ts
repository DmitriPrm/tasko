import { Module } from "@nestjs/common";

import { MeController } from "./me.controller";
import { ProfileSectionsController } from "./profile-sections.controller";
import { ProfileSectionsService } from "./profile-sections.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
	controllers: [UsersController, ProfileSectionsController, MeController],
	providers: [UsersService, ProfileSectionsService],
	exports: [UsersService],
})
export class UsersModule {}
