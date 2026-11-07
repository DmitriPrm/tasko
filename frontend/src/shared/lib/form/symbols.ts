import type { InjectionKey, Ref } from "vue";

import type { FormField, FormValues } from "@/shared/lib/form/types";

export interface BaseFormContext {
	fields: Ref<FormField[]>;
	values: Ref<FormValues>;
	init: (fields: FormField[]) => void;
	setFieldValue: (code: string, value: FormField["value"]) => void;
}

export const SYMBOL_BASE_FORM: InjectionKey<BaseFormContext> = Symbol("baseForm");
