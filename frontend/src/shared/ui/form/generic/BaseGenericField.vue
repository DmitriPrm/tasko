<script lang="ts" setup>
import type { FormField } from "@/shared/lib/form/types";
import BaseCheckbox from "@/shared/ui/form/fields/BaseCheckbox.vue";
import BaseDatePicker from "@/shared/ui/form/fields/BaseDatePicker.vue";
import BaseInput from "@/shared/ui/form/fields/BaseInput.vue";
import BaseSelect from "@/shared/ui/form/fields/BaseSelect.vue";
import BaseTextarea from "@/shared/ui/form/fields/BaseTextarea.vue";

interface Props {
	field: FormField;
}

defineProps<Props>();
</script>

<template>
	<base-input v-if="field.type === 'text'" :code="field.code" />
	<base-input v-else-if="field.type === 'password'" :code="field.code" password />
	<base-textarea v-else-if="field.type === 'textarea'" :code="field.code" />
	<base-select v-else-if="field.type === 'select'" :code="field.code" />
	<base-date-picker v-else-if="field.type === 'date'" :code="field.code" />
	<base-date-picker v-else-if="field.type === 'datetime'" :code="field.code" datetime />
	<base-checkbox v-else-if="field.type === 'checkbox'" :code="field.code" />
</template>
