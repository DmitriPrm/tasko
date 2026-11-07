import { computed, inject } from "vue";

import { SYMBOL_BASE_FORM } from "@/shared/lib/form/symbols";

export function useFormField({ code }: { code: string }) {
	const form = inject(SYMBOL_BASE_FORM);
	if (!form) {
		throw new Error("useFormField must be used inside BaseForm provider");
	}

	const field = computed(() => form.fields.value.find((item) => item.code === code));
	const model = computed({
		get: () => field.value?.value ?? null,
		set: (value) => form.setFieldValue(code, value),
	});

	return {
		field,
		model,
	};
}
