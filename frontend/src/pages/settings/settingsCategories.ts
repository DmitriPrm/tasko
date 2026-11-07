import { en } from "@/shared/lib/theming/i18n/en";
import { ru } from "@/shared/lib/theming/i18n/ru";

export const SETTINGS_CATEGORIES = [
	{
		id: "general",
		routeName: "settings-general",
		permission: "SETTINGS_GENERAL",
		titleKey: "settings.general",
		names: [ru.settings.general, en.settings.general],
	},
	{
		id: "rights",
		routeName: "settings-rights",
		permission: "SETTINGS_PERMISSIONS",
		titleKey: "settings.rights",
		names: [ru.settings.rights, en.settings.rights],
	},
] as const;

export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];
