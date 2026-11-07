<template>
	<el-config-provider :locale="elementLocale">
		<router-view :key="localeStore.locale" />
		<dialog-host />
	</el-config-provider>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import en from "element-plus/es/locale/lang/en";
import ru from "element-plus/es/locale/lang/ru";

import DialogHost from "@/shared/ui/dialog/DialogHost.vue";
import { useLocaleStore } from "@/store/locale";

const localeStore = useLocaleStore();
const elementLocale = computed(() => (localeStore.locale === "en" ? en : ru));
</script>
