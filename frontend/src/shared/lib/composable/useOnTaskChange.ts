import { watch } from "vue";

import { useTaskDrawerStore } from "@/store/taskDrawer";

export function useOnTaskChange(options: { reload: () => void | Promise<void> }) {
	const taskDrawer = useTaskDrawerStore();

	watch(
		() => taskDrawer.version,
		() => {
			options.reload();
		},
	);
}
