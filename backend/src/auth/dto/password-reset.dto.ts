import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";

export class ForgotPasswordDto {
	@IsEmail({}, { message: "Введите корректный email" })
	email: string;
}

/** Правила нового пароля — те же, что при регистрации */
export class ResetPasswordDto {
	@IsString()
	@Length(64, 64, { message: "Ссылка недействительна" })
	token: string;

	@IsString()
	@MinLength(8, { message: "Пароль должен быть не короче 8 символов" })
	@MaxLength(72, { message: "Пароль не должен быть длиннее 72 символов" })
	@Matches(/[A-Za-zА-Яа-я]/, { message: "Пароль должен содержать букву" })
	@Matches(/\d/, { message: "Пароль должен содержать цифру" })
	newPassword: string;
}
