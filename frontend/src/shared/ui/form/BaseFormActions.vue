<script lang="ts" setup>
import { translate } from "@/shared/lib/theming/i18n/translate";

const emit = defineEmits<{
	cancel: [];
}>();

defineProps<{
	submitLabel: string;
	loading?: boolean;
}>();

const handleCancel = () => emit("cancel");
</script>

<template>
	<base-flex justify="flex-start" :gap="3">
		<base-button native-type="submit" type="primary" :loading="loading">{{ submitLabel }}</base-button>
		<base-button @click="handleCancel">{{ translate("common.cancel") }}</base-button>
	</base-flex>
</template>
