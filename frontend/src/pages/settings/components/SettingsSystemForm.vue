<script lang="ts" setup>
import { translate } from "@/shared/lib/theming/i18n/translate";

/** Кнопки «Сохранить / Сбросить» под формой системного раздела */
defineProps<{
	dirty: boolean;
	saving?: boolean;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	save: [];
	reset: [];
}>();
</script>

<template>
	<base-flex :gap="3">
		<base-button type="primary" :loading="saving" :disabled="!dirty || disabled" @click="emit('save')">
			{{ translate("common.save") }}
		</base-button>
		<base-button :disabled="!dirty" @click="emit('reset')">{{ translate("settings.reset") }}</base-button>
	</base-flex>
</template>
