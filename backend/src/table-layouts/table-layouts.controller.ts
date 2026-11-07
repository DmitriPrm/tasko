import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { SaveTableLayoutDto } from "./dto/save-table-layout.dto";
import { TableCodePipe } from "./table-code.pipe";
import { TableLayoutsService } from "./table-layouts.service";

@ApiTags("table-layouts")
@ApiBearerAuth()
@Controller("table-layouts")
export class TableLayoutsController {
	constructor(private readonly tableLayoutsService: TableLayoutsService) {}

	@Get(":code")
	get(@CurrentUser() user: AuthUser, @Param("code", TableCodePipe) code: string) {
		return this.tableLayoutsService.get(user, code);
	}

	@Put(":code")
	save(
		@CurrentUser() user: AuthUser,
		@Param("code", TableCodePipe) code: string,
		@Body() dto: SaveTableLayoutDto,
	) {
		return this.tableLayoutsService.save(user, code, dto.widths);
	}
}
