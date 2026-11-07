<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import ProjectAnalytics from "@/pages/project/components/ProjectAnalytics.vue";
import { baseApi } from "@/shared/api/baseApi";
import type { Project } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BasePage from "@/shared/ui/page/BasePage.vue";

const projectId = ref("");

const { state, isLoading } = useFetch(baseApi.projects.getProjects, "data.items", {
	immediate: true,
	params: { perPage: 50 },
});

const projects = computed(() => (state.value || []) as Project[]);

watch(projects, (items) => {
	if (!projectId.value && items[0]) projectId.value = items[0].id;
});

const handleProject = (value: string) => {
	projectId.value = value;
};
</script>

<template>
	<base-page :title="translate('nav.analytics')">
		<template #actions>
			<el-select
				:model-value="projectId"
				:placeholder="translate('project.title')"
				:loading="isLoading && !projects.length"
				@change="handleProject"
			>
				<el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
			</el-select>
		</template>
		<project-analytics v-if="projectId" :project-id="projectId" />
		<el-empty v-else-if="!isLoading" :description="translate('common.empty')" />
	</base-page>
</template>
