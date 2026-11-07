<script lang="ts" setup>
import { useFormField } from "@/shared/lib/form/useFormField";
import BaseField from "@/shared/ui/form/field/BaseField.vue";

interface Props {
	code: string;
}

const props = defineProps<Props>();
const { field, model } = useFormField({ code: props.code });
</script>

<template>
	<base-field v-if="field" :field="field">
		<el-input v-model="model" type="textarea" :rows="3" :disabled="field.disabled" />
	</base-field>
</template>
