import { IsEnum, IsOptional, IsUUID } from "class-validator";

export enum ColumnTasksAction {
	DELETE = "delete",
	MOVE = "move",
}

export class DeleteColumnQueryDto {
	/** Что сделать с задачами колонки; обязательно, если в ней есть задачи */
	@IsOptional()
	@IsEnum(ColumnTasksAction)
	tasks?: ColumnTasksAction;

	@IsOptional()
	@IsUUID()
	targetColumnId?: string;
}
