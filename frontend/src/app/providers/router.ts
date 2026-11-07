import { createRouter, createWebHistory } from "vue-router";

import { JwtService } from "@/shared/lib/services/JwtService";
import { useAuthStore } from "@/store/auth";

export const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: "/login",
			name: "sign-in",
			component: () => import("@/pages/auth/SignInPage.vue"),
			meta: { public: true },
		},
		{
			path: "/register",
			name: "register",
			component: () => import("@/pages/auth/RegisterPage.vue"),
			meta: { public: true },
		},
		{
			path: "/verify-email/:token",
			name: "verify-email",
			component: () => import("@/pages/auth/VerifyEmailPage.vue"),
			meta: { open: true },
		},
		{
			path: "/invite/:token",
			name: "invite",
			component: () => import("@/pages/auth/InvitePage.vue"),
			meta: { open: true },
		},
		{
			path: "/",
			component: () => import("@/layout/AppLayout.vue"),
			children: [
				{
					path: "",
					name: "dashboard",
					component: () => import("@/pages/dashboard/DashboardPage.vue"),
				},
				{
					path: "projects",
					name: "projects",
					component: () => import("@/pages/projects/ProjectsPage.vue"),
				},
				{
					path: "projects/:id",
					name: "project",
					component: () => import("@/pages/project/ProjectPage.vue"),
					meta: { parent: "projects" },
				},
				{
					path: "invitations",
					name: "invitations",
					component: () => import("@/pages/invitations/InvitationsPage.vue"),
				},
				{
					path: "tasks",
					name: "tasks",
					component: () => import("@/pages/tasks/TasksPage.vue"),
				},
				{
					path: "analytics",
					name: "analytics",
					component: () => import("@/pages/analytics/AnalyticsPage.vue"),
					meta: { permission: "ANALYTICS_VIEW" },
				},
				{
					path: "settings",
					name: "settings",
					component: () => import("@/pages/settings/SettingsPage.vue"),
					meta: { anyPermission: ["SETTINGS_GENERAL", "SETTINGS_PERMISSIONS"] },
				},
				{
					path: "settings/general",
					name: "settings-general",
					component: () => import("@/pages/settings/SettingsCategoryPage.vue"),
					meta: { permission: "SETTINGS_GENERAL", parent: "settings" },
				},
				{
					path: "settings/rights",
					name: "settings-rights",
					component: () => import("@/pages/settings/SettingsCategoryPage.vue"),
					meta: { permission: "SETTINGS_PERMISSIONS", parent: "settings" },
				},
				{
					path: "notifications",
					name: "notifications",
					component: () => import("@/pages/notifications/NotificationsPage.vue"),
				},
				{
					path: "profile/:id?",
					name: "profile",
					component: () => import("@/pages/profile/ProfilePage.vue"),
				},
				{
					path: "users",
					name: "users",
					component: () => import("@/pages/admin/UsersPage.vue"),
					meta: { permission: "USERS_VIEW" },
				},
			],
		},
		{ path: "/:pathMatch(.*)*", redirect: "/" },
	],
});

router.beforeEach(async (to) => {
	const authStore = useAuthStore();
	if (!authStore.isReady) {
		await authStore.bootstrap();
	}

	// Страницы по ссылкам из писем доступны и гостям, и вошедшим пользователям
	if (to.meta.open) {
		return true;
	}

	if (to.meta.public) {
		if (authStore.isAuthenticated) {
			return { name: "dashboard" };
		}
		return true;
	}

	if (!JwtService.getToken() || !authStore.isAuthenticated) {
		return { name: "sign-in", query: to.fullPath !== "/" ? { redirect: to.fullPath } : undefined };
	}

	if (typeof to.meta.permission === "string" && !authStore.hasPermission(to.meta.permission)) {
		return { name: "dashboard" };
	}

	if (
		Array.isArray(to.meta.anyPermission) &&
		!to.meta.anyPermission.some((code) => typeof code === "string" && authStore.hasPermission(code))
	) {
		return { name: "dashboard" };
	}

	return true;
});
