import { ref } from "vue";
import { defineStore } from "pinia";

import { readTheme, setTheme, type AppTheme } from "@/shared/lib/theming/theme";

export const useThemeStore = defineStore("theme", () => {
	const theme = ref<AppTheme>(readTheme());

	const handleChange = (value: AppTheme) => {
		theme.value = value;
		setTheme(value);
	};

	return {
		theme,
		setTheme: handleChange,
	};
});
