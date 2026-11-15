<script lang="ts" setup>
import type { AppTheme } from "@/shared/lib/theming/theme";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import { useLocaleStore } from "@/store/locale";
import { useThemeStore } from "@/store/theme";

/** Язык и тема — личные предпочтения, применяются сразу и хранятся в этом браузере */
const localeStore = useLocaleStore();
const themeStore = useThemeStore();

const THEMES: AppTheme[] = ["light", "dark", "system"];

const handleLocale = (value: "ru" | "en") => localeStore.setLocale(value);
const handleTheme = (value: AppTheme) => themeStore.setTheme(value);
</script>

<template>
	<base-card class="settings-section">
		<el-form label-position="top" @submit.prevent>
			<el-form-item :label="translate('settings.language')">
				<el-segmented
					:model-value="localeStore.locale"
					:options="[
						{ value: 'ru', label: translate('locale.ru') },
						{ value: 'en', label: translate('locale.en') },
					]"
					@change="handleLocale"
				/>
			</el-form-item>
			<el-form-item :label="translate('settings.theme')">
				<el-segmented
					:model-value="themeStore.theme"
					:options="THEMES.map((value) => ({ value, label: translate(`theme.${value}`) }))"
					@change="handleTheme"
				/>
			</el-form-item>
			<p class="settings-section__hint">{{ translate("settings.appearanceHint") }}</p>
		</el-form>
	</base-card>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-section {
	max-width: 640px;
	padding: map.get($spacers, 6);

	&__hint {
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}
}
</style>
