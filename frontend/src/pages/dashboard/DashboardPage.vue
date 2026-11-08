<script lang="ts" setup>
import { Clock, List, Memo, Warning } from "@/shared/ui/icon/icons";
import { computed } from "vue";
import { useRouter } from "vue-router";

import DashboardTaskList from "@/pages/dashboard/components/DashboardTaskList.vue";
import { baseApi } from "@/shared/api/baseApi";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { useOnTaskChange } from "@/shared/lib/composable/useOnTaskChange";
import { projectStatusDot, projectStatusLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import BasePage from "@/shared/ui/page/BasePage.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";

const router = useRouter();

const { state, isLoading, fetch } = useFetch(baseApi.dashboard.getDashboard, "data", {
	immediate: true,
});

const summary = computed(() => state.value?.summary);
const summaryCards = computed(() => [
	{ key: "active", label: translate("dashboard.active"), value: summary.value?.active ?? 0, icon: Memo },
	{ key: "overdue", label: translate("dashboard.overdue"), value: summary.value?.overdue ?? 0, icon: Clock },
	{ key: "risk", label: translate("dashboard.highRisk"), value: summary.value?.highRisk ?? 0, icon: Warning },
]);
const projects = computed(() => state.value?.projects ?? []);
const myTasks = computed(() => state.value?.myTasks ?? []);
const upcoming = computed(() => state.value?.upcomingDeadlines ?? []);

const handleOpenProject = (projectId: string) => {
	router.push({ name: "project", params: { id: projectId } });
};

useOnTaskChange({ reload: () => fetch() });
</script>

<template>
	<base-page :title="translate('dashboard.title')">
		<el-skeleton :loading="isLoading && !state" animated>
			<base-flex direction="column" :gap="6">
				<base-flex :gap="4" wrap="wrap">
					<base-card
						v-for="card in summaryCards"
						:key="card.key"
						class="dashboard-page__summary"
						:class="`dashboard-page__summary--${card.key}`"
					>
						<el-icon class="dashboard-page__summary-icon" :size="20" aria-hidden="true">
							<component :is="card.icon" />
						</el-icon>
						<span>{{ card.label }}</span>
						<strong>{{ card.value }}</strong>
					</base-card>
				</base-flex>
				<section class="dashboard-page__section">
					<h3>{{ translate("dashboard.projects") }}</h3>
					<p v-if="!projects.length" class="dashboard-page__empty">{{ translate("common.empty") }}</p>
					<base-flex v-else :gap="4" wrap="wrap">
						<base-card
							v-for="project in projects"
							:key="project.id"
							interactive
							class="dashboard-page__project"
							@click="() => handleOpenProject(project.id)"
						>
							<base-flex direction="column" :gap="2">
								<strong>{{ project.name }}</strong>
								<base-flex class="dashboard-page__status" align="center" :gap="2">
									<span class="dashboard-page__dot" :style="{ background: projectStatusDot[project.status] }" />
									<span>{{ projectStatusLabel(project.status) }}</span>
								</base-flex>
								<base-flex class="dashboard-page__count" align="center" :gap="2">
									<el-icon :size="14" aria-hidden="true"><list /></el-icon>
									<span>{{ project.tasksCount }}</span>
								</base-flex>
								<base-user-name :user="project.owner" />
							</base-flex>
						</base-card>
					</base-flex>
				</section>
				<base-flex :gap="6" wrap="wrap">
					<dashboard-task-list :title="translate('task.my')" :tasks="myTasks" />
					<dashboard-task-list :title="translate('task.upcoming')" :tasks="upcoming" deadlines />
				</base-flex>
			</base-flex>
		</el-skeleton>
	</base-page>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.dashboard-page {
	&__section {
		h3 {
			margin: 0 0 map.get($spacers, 4);
			font-size: map.get($font-sizes, 4);
			font-weight: 650;
		}
	}

	&__summary {
		position: relative;
		min-width: 200px;
		flex: 1 1 200px;
		padding: map.get($spacers, 5) map.get($spacers, 6);
		overflow: hidden;
		--accent: var(--mt-color-primary);
		--accent-bg: var(--mt-color-primary-light);

		&--overdue {
			--accent: var(--mt-color-danger);
			--accent-bg: var(--mt-color-danger-light);
		}

		&--risk {
			--accent: var(--mt-color-warning);
			--accent-bg: var(--mt-color-warning-light);
		}

		span {
			display: block;
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 7);
			font-weight: 500;
		}

		strong {
			display: block;
			margin-top: map.get($spacers, 1);
			font-size: map.get($font-sizes, 1);
			font-weight: 700;
			letter-spacing: -0.03em;
		}
	}

	&__summary-icon {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		margin-bottom: map.get($spacers, 4);
		border-radius: 12px;
		background: var(--accent-bg);
		color: var(--accent);
	}

	&__project {
		width: 240px;
		max-width: 100%;
		padding: map.get($spacers, 4);

		strong {
			font-size: map.get($font-sizes, 6);
			font-weight: 650;
		}
	}

	&__status,
	&__count {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}

	&__dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	&__empty {
		margin: 0;
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 6);
	}
}
</style>
