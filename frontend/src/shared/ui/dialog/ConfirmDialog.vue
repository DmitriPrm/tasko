<script lang="ts" setup>
import { ref } from "vue";

import { translate } from "@/shared/lib/theming/i18n/translate";

const emit = defineEmits<{
	resolve: [value: true];
	cancel: [];
}>();

defineProps<{
	title?: string;
	text?: string;
	confirmLabel?: string;
}>();

const visible = ref(true);

const handleConfirm = () => emit("resolve", true);
const handleCancel = () => {
	visible.value = false;
	emit("cancel");
};
</script>

<template>
	<el-dialog
		v-model="visible"
		class="confirm-dialog"
		width="420px"
		align-center
		:title="title || translate('common.areYouSure')"
		@close="handleCancel"
	>
		<base-flex direction="column" :gap="5">
			<p class="confirm-dialog__text">{{ text || translate("common.confirmDelete") }}</p>
			<base-flex justify="flex-start" :gap="3">
				<base-button type="danger" @click="handleConfirm">{{ confirmLabel || translate("common.delete") }}</base-button>
				<base-button @click="handleCancel">{{ translate("common.cancel") }}</base-button>
			</base-flex>
		</base-flex>
	</el-dialog>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.confirm-dialog {
	&__text {
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
	}
}
</style>
