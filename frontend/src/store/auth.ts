import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { User } from "@/shared/api/v0/schemas";
import { JwtService } from "@/shared/lib/services/JwtService";

export const useAuthStore = defineStore("auth", () => {
	const user = ref<User | null>(null);
	const isReady = ref(false);

	const isAuthenticated = computed(() => Boolean(user.value));
	const isAdmin = computed(() => user.value?.systemRole === "ADMIN");
	const hasPermission = (code: string) => Boolean(user.value?.permissions?.includes(code));
	const isEmailVerified = computed(() => user.value?.emailVerified !== false);
	const canCreateProject = computed(() => hasPermission("PROJECTS_CREATE"));

	async function login(payload: { email: string; password: string }) {
		const { data } = await baseApi.auth.login(undefined, undefined, payload);
		JwtService.saveTokens(data.data);
		user.value = data.data.user;
	}

	async function register(payload: { fullName: string; email: string; password: string; inviteToken?: string }) {
		const { data } = await baseApi.auth.register(undefined, undefined, payload);
		JwtService.saveTokens(data.data);
		user.value = data.data.user;
		return { verificationSent: data.data.verificationSent, joinedProjectId: data.data.joinedProjectId };
	}

	async function refreshUser() {
		const { data } = await baseApi.auth.getMe();
		user.value = data.data;
	}

	async function bootstrap() {
		if (!JwtService.getToken()) {
			isReady.value = true;
			return;
		}

		try {
			const { data } = await baseApi.auth.getMe();
			user.value = data.data;
		} catch {
			JwtService.destroyTokens();
			user.value = null;
		} finally {
			isReady.value = true;
		}
	}

	function logout() {
		JwtService.destroyTokens();
		user.value = null;
	}

	return {
		user,
		isReady,
		isAuthenticated,
		isAdmin,
		hasPermission,
		canCreateProject,
		isEmailVerified,
		login,
		register,
		refreshUser,
		bootstrap,
		logout,
	};
});
