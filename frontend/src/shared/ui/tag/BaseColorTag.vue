<script lang="ts" setup>
import type { Tag } from "@/shared/api/v0/schemas";

const emit = defineEmits<{
	remove: [];
}>();

defineProps<{
	tag: Tag;
	closable?: boolean;
}>();

const handleRemove = () => emit("remove");
</script>

<template>
	<base-flex as="span" class="base-color-tag" align="center" :gap="1">
		<i class="base-color-tag__dot" :style="{ background: tag.color }" />
		{{ tag.name }}
		<button v-if="closable" class="base-color-tag__close" type="button" @click="handleRemove">×</button>
	</base-flex>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.base-color-tag {
	padding: 2px map.get($spacers, 2);
	border: 1px solid var(--mt-color-gray-100);
	border-radius: 99px;
	background: var(--mt-color-gray-50);
	color: var(--mt-color-gray-600);
	font-size: map.get($font-sizes, 8);
	font-weight: 500;

	&__dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	&__close {
		padding: 0 2px;
		border: 0;
		background: transparent;
		color: var(--mt-color-gray-400);
		cursor: pointer;

		&:hover {
			color: var(--mt-color-danger);
		}
	}
}
</style>
