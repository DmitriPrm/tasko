import { ElMessage } from "element-plus";
import { ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { SystemSettings } from "@/shared/api/v0/schemas";
import { translate } from "@/shared/lib/theming/i18n/translate";

/**
 * Системные настройки для разделов «Система»: загрузка и сохранение одного раздела.
 * Каждый раздел редактирует свою копию и сохраняет кнопкой — как в Jira и Linear.
 */
export function useSystemSettings() {
	const settings = ref<SystemSettings | null>(null);
	const isLoading = ref(false);
	const isSaving = ref(false);

	const load = async () => {
		isLoading.value = true;
		try {
			const response = await baseApi.settings.getSystemSettings();
			settings.value = response.data?.data ?? null;
		} finally {
			isLoading.value = false;
		}
	};

	/** Сохранить один или несколько разделов: save({ risk: {...}, deadlines: {...} }) */
	const save = async (patch: Partial<SystemSettings>) => {
		isSaving.value = true;
		try {
			const response = await baseApi.settings.updateSystemSettings(undefined, undefined, patch);
			settings.value = response.data?.data ?? settings.value;
			ElMessage({ type: "success", message: translate("settings.saved") });
			return true;
		} finally {
			isSaving.value = false;
		}
	};

	return { settings, isLoading, isSaving, load, save };
}
