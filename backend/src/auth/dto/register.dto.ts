import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
	@Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
	@IsString()
	@MinLength(2, { message: "Имя слишком короткое" })
	@MaxLength(80)
	fullName: string;

	@Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
	@IsEmail({}, { message: "Некорректный email" })
	@MaxLength(254)
	email: string;

	@IsString()
	@MinLength(8, { message: "Пароль должен быть не короче 8 символов" })
	@MaxLength(72, { message: "Пароль не должен быть длиннее 72 символов" })
	@Matches(/[A-Za-zА-Яа-я]/, { message: "Пароль должен содержать букву" })
	@Matches(/\d/, { message: "Пароль должен содержать цифру" })
	password: string;

	@IsOptional()
	@IsString()
	@MaxLength(128)
	inviteToken?: string;
}
