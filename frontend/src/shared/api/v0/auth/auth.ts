import { z } from "zod";

import { createGet, createPost } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { ZAuthSession, ZRegisterSession, ZSuccess, ZTokens, ZUser } from "@/shared/api/v0/schemas";

export const login = createPost({
	path: "/auth/login",
	type: ZWrapDTO(ZAuthSession),
});

export const register = createPost({
	path: "/auth/register",
	type: ZWrapDTO(ZRegisterSession),
});

export const verifyEmail = createPost({
	path: "/auth/verify-email",
	type: ZWrapDTO(ZSuccess),
});

export const resendVerification = createPost({
	path: "/auth/resend-verification",
	type: ZWrapDTO(z.object({ sent: z.boolean(), alreadyVerified: z.boolean() })),
});

export const refresh = createPost({
	path: "/auth/refresh",
	type: ZWrapDTO(ZTokens),
});

export const getMe = createGet({
	path: "/auth/me",
	type: ZWrapDTO(ZUser),
});

/** Сменить пароль; ответ — новые токены для текущей сессии (остальные отзываются) */
export const changePassword = createPost({
	path: "/auth/change-password",
	type: ZWrapDTO(ZTokens),
});

/** Выйти на всех устройствах; текущая сессия получает новые токены */
export const logoutAll = createPost({
	path: "/auth/logout-all",
	type: ZWrapDTO(ZTokens),
});

/** «Забыли пароль?»: ответ одинаковый для любого адреса */
export const forgotPassword = createPost({
	path: "/auth/forgot-password",
	type: ZWrapDTO(ZSuccess),
});

/** Новый пароль по ссылке из письма */
export const resetPassword = createPost({
	path: "/auth/reset-password",
	type: ZWrapDTO(ZSuccess),
});
