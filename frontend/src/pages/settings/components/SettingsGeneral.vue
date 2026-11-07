<script lang="ts" setup>
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";
import { useAuthStore } from "@/store/auth";
import { useLocaleStore } from "@/store/locale";
import { useThemeStore } from "@/store/theme";

const authStore = useAuthStore();
const localeStore = useLocaleStore();
const themeStore = useThemeStore();

const handleLocale = (value: "ru" | "en") => localeStore.setLocale(value);
const handleTheme = (value: "light" | "dark") => themeStore.setTheme(value);
</script>

<template>
	<base-card class="settings-general">
		<base-flex direction="column" :gap="5">
			<base-user-name v-if="authStore.user" :user="authStore.user" :size="32" />
			<base-flex class="settings-general__field" direction="column" :gap="2">
				<span>{{ translate("settings.language") }}</span>
				<el-select :model-value="localeStore.locale" @change="handleLocale">
					<el-option :label="translate('locale.ru')" value="ru" />
					<el-option :label="translate('locale.en')" value="en" />
				</el-select>
			</base-flex>
			<base-flex class="settings-general__field" direction="column" :gap="2">
				<span>{{ translate("settings.theme") }}</span>
				<el-select :model-value="themeStore.theme" @change="handleTheme">
					<el-option :label="translate('theme.light')" value="light" />
					<el-option :label="translate('theme.dark')" value="dark" />
				</el-select>
			</base-flex>
		</base-flex>
	</base-card>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-general {
	max-width: 480px;
	padding: map.get($spacers, 6);

	&__field span {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}
}
</style>
