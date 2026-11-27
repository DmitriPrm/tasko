import { defineStore } from "pinia";
import { ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { PublicSettings, UserPreferences } from "@/shared/api/v0/schemas";

/**
 * Личные настройки пользователя и общие (публичные) системные настройки.
 * Загружаются один раз после входа; страницы берут отсюда вид проекта, стартовую страницу и т. п.
 */
export const useUserSettingsStore = defineStore("userSettings", () => {
	const preferences = ref<UserPreferences | null>(null);
	const system = ref<PublicSettings | null>(null);
	let loading: Promise<void> | null = null;

	const load = () => {
		loading = Promise.all([baseApi.me.getPreferences(), baseApi.settings.getPublicSettings()])
			.then(([prefs, pub]) => {
				preferences.value = prefs.data?.data ?? null;
				system.value = pub.data?.data ?? null;
			})
			.catch(() => {
				// Без настроек приложение работает со значениями по умолчанию
			});
		return loading;
	};

	/** Загрузить, если ещё не загружено */
	const ensureLoaded = () => loading ?? load();

	const updatePreferences = async (patch: Partial<UserPreferences>) => {
		const response = await baseApi.me.updatePreferences(undefined, undefined, patch);
		preferences.value = response.data?.data ?? preferences.value;
	};

	/** Вид проекта: личный выбор, иначе системный по умолчанию */
	const projectView = () => preferences.value?.projectView ?? system.value?.projects.defaultView ?? "board";

	const reset = () => {
		preferences.value = null;
		system.value = null;
		loading = null;
	};

	return { preferences, system, load, ensureLoaded, updatePreferences, projectView, reset };
});
