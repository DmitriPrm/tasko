<script lang="ts" setup>
import { Filter as FilterIcon, Search } from "@/shared/ui/icon/icons";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import ProjectCard from "@/pages/projects/components/ProjectCard.vue";
import ProjectCreateDialog from "@/pages/projects/components/ProjectCreateDialog.vue";
import ProjectEditDialog from "@/pages/projects/components/ProjectEditDialog.vue";
import { baseApi } from "@/shared/api/baseApi";
import type { Project, ProjectStatus } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { openDialog } from "@/shared/lib/dialog/dialog";
import { projectStatusLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BasePage from "@/shared/ui/page/BasePage.vue";
import { useAuthStore } from "@/store/auth";

const STATUSES: ProjectStatus[] = ["PLANNED", "ACTIVE", "COMPLETED", "ARCHIVED"];

const authStore = useAuthStore();
const router = useRouter();
const search = ref("");
const status = ref<ProjectStatus | "">("");

const params = computed(() => ({
	search: search.value || undefined,
	status: status.value || undefined,
	perPage: 20,
}));

const { state, isLoading, fetch } = useFetch(baseApi.projects.getProjects, "data", {
	immediate: true,
	params,
});

const projects = computed(() => (state.value?.items ?? []) as Project[]);

const handleSearch = (value: string) => {
	search.value = value;
};

const handleStatus = (value: ProjectStatus | "") => {
	status.value = value || "";
};

const canEditProject = (project: Project) => {
	if (authStore.isAdmin) return true;
	return Boolean(
		project.members?.some((member) => member.userId === authStore.user?.id && member.projectRole === "MANAGER"),
	);
};

const handleEdit = async (projectId: string) => {
	const updated = await openDialog(ProjectEditDialog, { projectId });
	if (updated) await fetch();
};

const handleOpenCreate = async () => {
	const created = await openDialog(ProjectCreateDialog);
	if (created) await fetch();
};
</script>

<template>
	<base-page :title="translate('project.title')">
		<template #actions>
			<base-flex align="center" :gap="3" wrap="wrap">
				<el-popover trigger="click" :width="260">
					<div id="projects-page-filters">
						<base-flex class="projects-page__filters" direction="column" :gap="3">
							<strong>{{ translate("common.filters") }}</strong>
							<el-select
								:model-value="status"
								clearable
								:teleported="false"
								:placeholder="translate('project.status')"
								@change="(value: ProjectStatus) => handleStatus(value || '')"
							>
								<el-option v-for="item in STATUSES" :key="item" :label="projectStatusLabel(item)" :value="item" />
							</el-select>
						</base-flex>
					</div>
					<template #reference>
						<base-button>
							<base-flex align="center" :gap="1">
								<el-icon :size="16" aria-hidden="true">
									<filter-icon />
								</el-icon>
								<span>{{ translate("common.filters") }}</span>
							</base-flex>
						</base-button>
					</template>
				</el-popover>
				<base-button v-if="authStore.canCreateProject" type="primary" @click="handleOpenCreate">
					{{ translate("project.create") }}
				</base-button>
			</base-flex>
		</template>
		<template #subtitle>
			<el-input
				class="projects-page__search"
				:model-value="search"
				:placeholder="translate('common.search')"
				:prefix-icon="Search"
				clearable
				@update:model-value="(value: string) => handleSearch(value)"
			/>
		</template>
		<el-skeleton :loading="isLoading && !state" animated>
			<el-empty v-if="!projects.length" :description="translate('project.emptyHint')">
				<base-flex :gap="3" justify="center">
					<base-button type="primary" @click="() => router.push({ name: 'invitations' })">
						{{ translate("invitation.mineTitle") }}
					</base-button>
				</base-flex>
			</el-empty>
			<div v-else class="projects-page__grid">
				<project-card
					v-for="project in projects"
					:key="project.id"
					:project="project"
					:editable="canEditProject(project)"
					@edit="handleEdit"
				/>
			</div>
		</el-skeleton>
	</base-page>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.projects-page {
	&__grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: map.get($spacers, 4);

		@media (max-width: 1400px) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		@media (max-width: 1000px) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		@media (max-width: 640px) {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	&__search {
		margin-top: map.get($spacers, 4);
		max-width: 320px;

		:deep(.el-input__wrapper) {
			border-radius: 99px;
			box-shadow: 0 0 0 1px var(--mt-color-gray-200) inset;
		}
	}

	@media (max-width: 768px) {
		&__search {
			max-width: 100%;
		}
	}
}
</style>
