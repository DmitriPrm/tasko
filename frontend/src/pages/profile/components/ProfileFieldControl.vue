<script lang="ts" setup>
import { computed } from "vue";

import type { ProfileFieldType } from "@/shared/api/v0/schemas";
import { DATE_FIELD_FORMAT } from "@/shared/lib/helpers/formatDate";

const emit = defineEmits<{
	"update:modelValue": [value: string];
}>();

const props = defineProps<{
	type: ProfileFieldType;
	options: string[];
	modelValue: string;
}>();

const multiValue = computed(() => {
	try {
		const parsed = JSON.parse(props.modelValue);
		return Array.isArray(parsed) ? parsed.map(String) : [];
	} catch {
		return props.modelValue ? [props.modelValue] : [];
	}
});

const handleText = (value: string) => emit("update:modelValue", value);
const handleNumber = (value: number | null | undefined) => emit("update:modelValue", value == null ? "" : String(value));
const handleDate = (value: string) => emit("update:modelValue", value || "");
const handleCheck = (value: string | number | boolean) => emit("update:modelValue", value === true || value === "true" ? "true" : "false");
const handleSelect = (value: string) => emit("update:modelValue", value || "");
const handleMulti = (value: string[]) => emit("update:modelValue", JSON.stringify(value));
</script>

<template>
	<el-input
		v-if="type === 'TEXT'"
		:model-value="modelValue"
		@update:model-value="handleText"
	/>
	<el-input
		v-else-if="type === 'TEXTAREA'"
		type="textarea"
		:rows="3"
		:model-value="modelValue"
		@update:model-value="handleText"
	/>
	<el-input-number
		v-else-if="type === 'NUMBER'"
		:model-value="modelValue === '' ? undefined : Number(modelValue)"
		@update:model-value="handleNumber"
	/>
	<el-date-picker
		v-else-if="type === 'DATE'"
		type="date"
		value-format="YYYY-MM-DD"
		:format="DATE_FIELD_FORMAT"
		:model-value="modelValue || undefined"
		@update:model-value="handleDate"
	/>
	<el-checkbox
		v-else-if="type === 'CHECKBOX'"
		:model-value="modelValue === 'true'"
		@change="handleCheck"
	/>
	<el-select
		v-else-if="type === 'SELECT'"
		clearable
		:model-value="modelValue || undefined"
		@change="handleSelect"
	>
		<el-option v-for="option in options" :key="option" :label="option" :value="option" />
	</el-select>
	<el-select
		v-else
		multiple
		:model-value="multiValue"
		@change="handleMulti"
	>
		<el-option v-for="option in options" :key="option" :label="option" :value="option" />
	</el-select>
</template>
