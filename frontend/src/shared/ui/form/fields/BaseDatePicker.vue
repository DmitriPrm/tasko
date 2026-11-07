<script lang="ts" setup>
import { DATE_FIELD_FORMAT, DATETIME_FIELD_FORMAT } from "@/shared/lib/helpers/formatDate";
import { useFormField } from "@/shared/lib/form/useFormField";
import BaseField from "@/shared/ui/form/field/BaseField.vue";

interface Props {
	code: string;
	datetime?: boolean;
}

const props = defineProps<Props>();
const { field, model } = useFormField({ code: props.code });
</script>

<template>
	<base-field v-if="field" :field="field">
		<el-date-picker
			v-model="model"
			:type="datetime ? 'datetime' : 'date'"
			:disabled="field.disabled"
			:format="datetime ? DATETIME_FIELD_FORMAT : DATE_FIELD_FORMAT"
			value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
			style="width: 100%"
		/>
	</base-field>
</template>
