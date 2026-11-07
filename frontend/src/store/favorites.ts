import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { baseApi } from "@/shared/api/baseApi";
import type { Project } from "@/shared/api/v0/schemas";

export const useFavoritesStore = defineStore("favorites", () => {
	const items = ref<Project[]>([]);

	const hasFavorites = computed(() => items.value.length > 0);

	const load = async () => {
		const { data } = await baseApi.projects.getFavoriteProjects();
		items.value = data.data;
	};

	const toggle = async (project: { id: string; isFavorite?: boolean }) => {
		if (project.isFavorite) {
			await baseApi.projects.removeProjectFavorite({ id: project.id });
		} else {
			await baseApi.projects.addProjectFavorite({ id: project.id });
		}
		await load();
	};

	return {
		items,
		hasFavorites,
		load,
		toggle,
	};
});
