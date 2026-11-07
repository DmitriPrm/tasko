<script lang="ts" setup>
type ButtonType = "primary" | "success" | "warning" | "danger" | "info" | "default";
type ButtonNativeType = "button" | "submit" | "reset";

interface Props {
	type?: ButtonType;
	nativeType?: ButtonNativeType;
	text?: boolean;
	plain?: boolean;
	loading?: boolean;
	disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
	type: "default",
	nativeType: "button",
});
</script>

<template>
	<el-button
		class="base-button"
		:type="type === 'default' ? undefined : type"
		:native-type="nativeType"
		:text="text"
		:plain="plain"
		:loading="loading"
		:disabled="disabled"
	>
		<slot />
	</el-button>
</template>

<style scoped lang="scss">
.base-button {
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease;

	& + & {
		margin-left: 0;
	}
}
</style>
