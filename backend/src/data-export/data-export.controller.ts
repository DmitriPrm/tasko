import { Controller, Get, Header, Query, StreamableFile } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { DataExportService } from "./data-export.service";

class ExportQueryDto {
	@IsOptional()
	@IsUUID()
	projectId?: string;
}

class AuditQueryDto {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	perPage?: number;

	@IsOptional()
	@IsUUID()
	projectId?: string;

	@IsOptional()
	@IsUUID()
	userId?: string;
}

const csvFile = (content: string, name: string) =>
	new StreamableFile(Buffer.from(content, "utf-8"), {
		type: "text/csv; charset=utf-8",
		disposition: `attachment; filename="${name}"`,
	});

@ApiTags("settings")
@ApiBearerAuth()
@Controller("settings/data")
export class DataExportController {
	constructor(private readonly data: DataExportService) {}

	@Get("tasks.csv")
	@Header("Cache-Control", "no-store")
	async tasks(@CurrentUser() user: AuthUser, @Query() query: ExportQueryDto) {
		return csvFile(await this.data.tasksCsv(user, query.projectId), "tasko-tasks.csv");
	}

	@Get("ml-dataset.csv")
	@Header("Cache-Control", "no-store")
	async mlDataset(@CurrentUser() user: AuthUser) {
		return csvFile(await this.data.mlDatasetCsv(user), "tasko-ml-dataset.csv");
	}

	@Get("audit")
	audit(@CurrentUser() user: AuthUser, @Query() query: AuditQueryDto) {
		return this.data.audit(user, query);
	}
}
