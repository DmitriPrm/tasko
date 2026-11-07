<script lang="ts" setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

import SettingsGeneral from "@/pages/settings/components/SettingsGeneral.vue";
import SettingsRights from "@/pages/settings/components/SettingsRights.vue";
import { SETTINGS_CATEGORIES } from "@/pages/settings/settingsCategories";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BasePage from "@/shared/ui/page/BasePage.vue";
import { useLocaleStore } from "@/store/locale";

const route = useRoute();
const localeStore = useLocaleStore();

const category = computed(() => SETTINGS_CATEGORIES.find((item) => item.routeName === route.name));

const title = computed(() => {
	localeStore.locale;
	return category.value ? translate(category.value.titleKey) : translate("settings.title");
});
</script>

<template>
	<base-page :title="title">
		<settings-general v-if="category?.id === 'general'" />
		<settings-rights v-else-if="category?.id === 'rights'" />
	</base-page>
</template>
