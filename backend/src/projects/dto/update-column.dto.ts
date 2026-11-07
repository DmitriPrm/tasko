import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateColumnDto {
	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(255)
	name?: string;

	@IsOptional()
	@IsHexColor()
	color?: string;
}
