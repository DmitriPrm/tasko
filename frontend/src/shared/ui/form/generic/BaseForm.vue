<script lang="ts" setup>
import { inject } from "vue";

import { SYMBOL_BASE_FORM } from "@/shared/lib/form/symbols";
import BaseButton from "@/shared/ui/button/BaseButton.vue";
import BaseGenericField from "@/shared/ui/form/generic/BaseGenericField.vue";

const emit = defineEmits<{
	submit: [];
}>();

interface Props {
	hideActions?: boolean;
	submitLabel?: string;
}

withDefaults(defineProps<Props>(), {
	submitLabel: "Сохранить",
});

const form = inject(SYMBOL_BASE_FORM);
if (!form) {
	throw new Error("BaseForm must be used after useForm() in parent");
}

const handleSubmit = () => emit("submit");
</script>

<template>
	<form class="base-form" @submit.prevent="handleSubmit">
		<slot :fields="form.fields.value">
			<base-generic-field v-for="field in form.fields.value" :key="field.code" :field="field" />
		</slot>
		<slot name="actions">
			<base-flex v-if="!hideActions" justify="flex-end" :gap="3">
				<slot name="extra-actions" />
				<base-button native-type="submit" type="primary">{{ submitLabel }}</base-button>
			</base-flex>
		</slot>
	</form>
</template>
