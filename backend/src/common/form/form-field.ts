export type FormFieldType = "text" | "textarea" | "select" | "date" | "datetime" | "checkbox" | "password";

export interface FormPossibleValue {
	id: string;
	code: string;
	name: string;
}

export interface FormField {
	code: string;
	name: string;
	type: FormFieldType;
	value: string | boolean | null;
	require?: boolean;
	disabled?: boolean;
	description?: string;
	possibleValues?: FormPossibleValue[];
}

export function makeField(field: FormField): FormField {
	return field;
}

export function option(id: string, name: string): FormPossibleValue {
	return { id, code: id, name };
}
