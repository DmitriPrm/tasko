import { IsHexColor, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateColumnDto {
	@IsString()
	@MinLength(1)
	@MaxLength(255)
	name: string;

	@IsOptional()
	@IsHexColor()
	color?: string;

	/** Новая колонка встаёт после указанной и наследует её статус; без значения - в конец */
	@IsOptional()
	@IsUUID()
	afterColumnId?: string;
}
