<script lang="ts" setup>
import { useRouter } from "vue-router";

import type { SettingsCategory } from "@/pages/settings/settingsCategories";
import BaseCard from "@/shared/ui/card/BaseCard.vue";

const props = defineProps<{
	title: string;
	routeName: SettingsCategory["routeName"];
}>();

const router = useRouter();

const handleOpen = () => router.push({ name: props.routeName });
</script>

<template>
	<base-card interactive class="settings-category-card" @click="handleOpen">
		<strong>{{ title }}</strong>
	</base-card>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-category-card {
	flex: 1 1 280px;
	max-width: 420px;
	min-width: min(100%, 280px);
	padding: map.get($spacers, 5);
	cursor: pointer;

	strong {
		font-size: map.get($font-sizes, 5);
		font-weight: 600;
	}
}
</style>
