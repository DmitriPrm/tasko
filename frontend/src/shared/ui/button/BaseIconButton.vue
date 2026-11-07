<script lang="ts" setup>
const emit = defineEmits<{
	click: [];
}>();

defineProps<{
	label: string;
	danger?: boolean;
}>();

const handleClick = () => emit("click");
</script>

<template>
	<base-button
		class="base-icon-button"
		text
		:type="danger ? 'danger' : undefined"
		:aria-label="label"
		:title="label"
		@click.stop="handleClick"
	>
		<slot />
	</base-button>
</template>

<style scoped lang="scss">
.base-icon-button {
	padding: 4px;
}
</style>
