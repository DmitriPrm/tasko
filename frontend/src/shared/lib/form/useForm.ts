import { computed, provide, ref } from "vue";

import { SYMBOL_BASE_FORM } from "@/shared/lib/form/symbols";
import type { FormField, FormValues } from "@/shared/lib/form/types";

export function useForm() {
	const fields = ref<FormField[]>([]);

	const init = (payload: FormField[]) => {
		fields.value = payload.map((field) => ({ ...field }));
	};

	const setFieldValue = (code: string, value: FormField["value"]) => {
		const field = fields.value.find((item) => item.code === code);
		if (field) {
			field.value = value;
		}
	};

	const values = computed<FormValues>(() => Object.fromEntries(fields.value.map((field) => [field.code, field.value])));

	const payload = computed(() => {
		const result: Record<string, unknown> = {};
		for (const field of fields.value) {
			if (field.value === "" || field.value === null) {
				continue;
			}
			result[field.code] = field.value;
		}
		return result;
	});

	const context = {
		fields,
		values,
		init,
		setFieldValue,
	};

	provide(SYMBOL_BASE_FORM, context);

	return {
		...context,
		payload,
	};
}
