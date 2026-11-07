import { markRaw, shallowRef, type Component } from "vue";

export interface DialogRecord {
	id: string;
	component: Component;
	props: Record<string, unknown>;
	resolve: (value: unknown) => void;
}

const dialogs = shallowRef<DialogRecord[]>([]);

export function openDialog<T = boolean>(
	component: Component,
	props: Record<string, unknown> = {},
): Promise<T | false> {
	return new Promise((resolve) => {
		dialogs.value = [
			...dialogs.value,
			{
				id: crypto.randomUUID(),
				component: markRaw(component),
				props,
				resolve: resolve as (value: unknown) => void,
			},
		];
	});
}

export function closeDialog(id: string, result: unknown = false) {
	const current = dialogs.value.find((dialog) => dialog.id === id);
	current?.resolve(result);
	dialogs.value = dialogs.value.filter((dialog) => dialog.id !== id);
}

export function useDialogs() {
	return { dialogs };
}
