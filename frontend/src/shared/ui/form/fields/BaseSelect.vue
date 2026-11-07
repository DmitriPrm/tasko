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
		<el-select v-model="model" :disabled="field.disabled" :clearable="!field.require" filterable>
			<el-option
				v-for="option in field.possibleValues || []"
				:key="option.id"
				:label="option.name"
				:value="option.id"
			/>
		</el-select>
	</base-field>
</template>
