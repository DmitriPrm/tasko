<script lang="ts" setup>
import { Search } from "@/shared/ui/icon/icons";
import { computed, ref } from "vue";

import SettingsCategoryCard from "@/pages/settings/components/SettingsCategoryCard.vue";
import { SETTINGS_CATEGORIES } from "@/pages/settings/settingsCategories";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BasePage from "@/shared/ui/page/BasePage.vue";
import { useAuthStore } from "@/store/auth";
import { useLocaleStore } from "@/store/locale";

const authStore = useAuthStore();
const localeStore = useLocaleStore();
const search = ref("");

const categories = computed(() => {
	void localeStore.locale; // пересчитать при смене языка
	const query = search.value.trim().toLowerCase();
	return SETTINGS_CATEGORIES.filter((item) => authStore.hasPermission(item.permission))
		.filter((item) => !query || item.names.some((name) => name.toLowerCase().includes(query)))
		.map((item) => ({
			...item,
			title: translate(item.titleKey),
		}));
});

const handleSearch = (value: string) => {
	search.value = value;
};
</script>

<template>
	<base-page class="settings-page" :title="translate('settings.title')">
		<template #subtitle>
			<el-input
				class="settings-page__search"
				:model-value="search"
				:placeholder="translate('common.search')"
				:prefix-icon="Search"
				clearable
				@update:model-value="(value: string) => handleSearch(value)"
			/>
		</template>
		<el-empty v-if="!categories.length" :description="translate('settings.noResults')" />
		<base-flex v-else :gap="4" wrap="wrap">
			<settings-category-card
				v-for="category in categories"
				:key="category.id"
				:title="category.title"
				:route-name="category.routeName"
			/>
		</base-flex>
	</base-page>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-page {
	&__search {
		margin-top: map.get($spacers, 4);
		max-width: 320px;

		:deep(.el-input__wrapper) {
			border-radius: 99px;
			box-shadow: 0 0 0 1px var(--mt-color-gray-200) inset;
		}
	}

	@media (max-width: 768px) {
		&__search {
			max-width: 100%;
		}
	}
}
</style>
