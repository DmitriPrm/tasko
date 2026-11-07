import { defineStore } from "pinia";
import { ref } from "vue";

export const useTaskDrawerStore = defineStore("taskDrawer", () => {
	const taskId = ref<string | null>(null);
	const version = ref(0);

	const open = (id: string) => {
		taskId.value = id;
	};

	const close = () => {
		taskId.value = null;
	};

	const markChanged = () => {
		version.value += 1;
	};

	return { taskId, version, open, close, markChanged };
});
