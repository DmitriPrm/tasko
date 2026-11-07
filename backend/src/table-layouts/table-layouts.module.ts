import { Module } from "@nestjs/common";

import { TableLayoutsController } from "./table-layouts.controller";
import { TableLayoutsService } from "./table-layouts.service";

@Module({
	controllers: [TableLayoutsController],
	providers: [TableLayoutsService],
})
export class TableLayoutsModule {}
