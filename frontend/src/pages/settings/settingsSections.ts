import type { Component } from "vue";
import { defineAsyncComponent } from "vue";

import { Bell, Board, Clock, Folder, Globe, Lock, Memo, PieChart, Setting, Unlock, User } from "@/shared/ui/icon/icons";

export type SettingsGroup = "personal" | "system";

export interface SettingsSection {
	id: string;
	group: SettingsGroup;
	icon: Component;
	/** Право, без которого раздел не виден; у личных разделов его нет */
	permission?: string;
	component: Component;
}

/**
 * Разделы настроек. Личные видны всем, системные — по правам.
 * Новый раздел добавляется сюда: меню, адрес и поиск подхватят его сами.
 */
export const SETTINGS_SECTIONS: SettingsSection[] = [
	{
		id: "account",
		group: "personal",
		icon: Lock,
		component: defineAsyncComponent(() => import("@/pages/settings/components/SettingsAccount.vue")),
	},
	{
		id: "notifications",
		group: "personal",
		icon: Bell,
		component: defineAsyncComponent(() => import("@/pages/settings/components/SettingsNotifications.vue")),
	},
	{
		id: "workspace",
		group: "personal",
		icon: Board,
		component: defineAsyncComponent(() => import("@/pages/settings/components/SettingsWorkspace.vue")),
	},
	{
		id: "appearance",
		group: "personal",
		icon: Setting,
		component: defineAsyncComponent(() => import("@/pages/settings/components/SettingsAppearance.vue")),
	},
	{
		id: "rights",
		group: "system",
		icon: User,
		permission: "SETTINGS_PERMISSIONS",
		component: defineAsyncComponent(() => import("@/pages/settings/components/SettingsRights.vue")),
	},
	{
		id: "risks",
		group: "system",
		icon: Clock,
		permission: "SETTINGS_SYSTEM",
		component: defineAsyncComponent(() => import("@/pages/settings/components/SettingsRisks.vue")),
	},
	{
		id: "ml",
		group: "system",
		icon: PieChart,
		permission: "SETTINGS_SYSTEM",
		component: defineAsyncComponent(() => import("@/pages/settings/components/SettingsMl.vue")),
	},
	{
		id: "registration",
		group: "system",
		icon: Unlock,
		permission: "SETTINGS_SYSTEM",
		component: defineAsyncComponent(() => import("@/pages/settings/components/SettingsRegistration.vue")),
	},
	{
		id: "projects",
		group: "system",
		icon: Folder,
		permission: "SETTINGS_SYSTEM",
		component: defineAsyncComponent(() => import("@/pages/settings/components/SettingsProjects.vue")),
	},
	{
		id: "files",
		group: "system",
		icon: Memo,
		permission: "SETTINGS_SYSTEM",
		component: defineAsyncComponent(() => import("@/pages/settings/components/SettingsFiles.vue")),
	},
	{
		id: "mail",
		group: "system",
		icon: Globe,
		permission: "SETTINGS_SYSTEM",
		component: defineAsyncComponent(() => import("@/pages/settings/components/SettingsMail.vue")),
	},
];
