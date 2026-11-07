<script lang="ts" setup>
withDefaults(
	defineProps<{
		as?: string;
		interactive?: boolean;
	}>(),
	{
		as: "article",
	},
);
</script>

<template>
	<component :is="as" class="base-card" :class="{ 'base-card--interactive': interactive }">
		<slot />
	</component>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.base-card {
	background: var(--mt-color-white);
	border: 1px solid var(--mt-color-gray-100);
	border-radius: var(--mt-radius);
	box-shadow: var(--mt-shadow);
	transition:
		transform 0.22s var(--mt-ease),
		box-shadow 0.22s var(--mt-ease),
		border-color 0.22s var(--mt-ease);

	&--interactive {
		cursor: pointer;
	}

	&--interactive:hover {
		transform: translateY(-3px);
		border-color: var(--mt-color-primary-light);
		box-shadow: var(--mt-shadow-hover);
	}
}
</style>
