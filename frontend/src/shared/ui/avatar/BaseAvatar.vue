<script lang="ts" setup>
import { computed } from "vue";

interface Props {
	name?: string;
	initials?: string;
	color?: string;
	src?: string | null;
	size?: number;
}

const props = withDefaults(defineProps<Props>(), {
	size: 28,
});

const letters = computed(() => {
	if (props.initials) return props.initials;
	const parts = (props.name || "?").trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
});

const background = computed(() => props.color || "var(--mt-color-primary)");
</script>

<template>
	<base-flex
		as="span"
		class="base-avatar"
		align="center"
		justify="center"
		:title="name"
		:style="{
			width: `${size}px`,
			height: `${size}px`,
			background,
			fontSize: `${Math.round(size * 0.36)}px`,
		}"
	>
		<img v-if="src" class="base-avatar__image" :src="src" :alt="name || letters" />
		<template v-else>{{ letters }}</template>
	</base-flex>
</template>

<style scoped lang="scss">
.base-avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	border-radius: 50%;
	color: var(--mt-color-primary-inverse);
	flex-shrink: 0;
	font-weight: 600;
	box-shadow: 0 0 0 2px var(--mt-color-white);

	&__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}
</style>
