import { computed } from "vue";
import { defineStore } from "pinia";

import { i18n, setLocale } from "@/shared/lib/theming/i18n/translate";

export const useLocaleStore = defineStore("locale", () => {
	const locale = computed(() => i18n.global.locale.value as "ru" | "en");

	const handleChange = (value: "ru" | "en") => {
		setLocale(value);
	};

	return {
		locale,
		setLocale: handleChange,
	};
});
