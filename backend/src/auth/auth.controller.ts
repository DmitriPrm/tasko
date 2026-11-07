import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { AuthService } from "./auth.service";
import { AuthUser } from "./auth.types";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Public()
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@Post("register")
	register(@Body() dto: RegisterDto) {
		return this.authService.register(dto);
	}

	@Public()
	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	@Post("verify-email")
	verifyEmail(@Body() dto: VerifyEmailDto) {
		return this.authService.verifyEmail(dto.token);
	}

	@ApiBearerAuth()
	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	@Post("resend-verification")
	resendVerification(@CurrentUser() user: AuthUser) {
		return this.authService.resendVerification(user);
	}

	@Public()
	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	@Post("login")
	login(@Body() dto: LoginDto) {
		return this.authService.login(dto);
	}

	@Public()
	@Post("refresh")
	refresh(@Body() dto: RefreshDto) {
		return this.authService.refresh(dto.refreshToken);
	}

	@ApiBearerAuth()
	@Get("me")
	me(@CurrentUser() user: AuthUser) {
		return this.authService.me(user);
	}
}
