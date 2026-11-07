<script lang="ts" setup>
defineProps<{
	label: string;
}>();
</script>

<template>
	<span class="base-description-item__label">{{ label }}</span>
	<div class="base-description-item__value">
		<slot />
	</div>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.base-description-item {
	&__label {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
	}

	&__value {
		min-width: 0;
		font-size: map.get($font-sizes, 6);
	}
}
</style>
