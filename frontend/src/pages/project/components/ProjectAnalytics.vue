<script lang="ts" setup>
import { computed } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { WorkloadItem } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { STATUS_RANK, statusLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import ProjectRiskAnalytics from "@/pages/project/components/ProjectRiskAnalytics.vue";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import BaseBarChart from "@/shared/ui/chart/BaseBarChart.vue";
import BaseTable from "@/shared/ui/table/BaseTable.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";

const props = defineProps<{
	projectId: string;
}>();

const pathParams = computed(() => ({ id: props.projectId }));

const { state: overview } = useFetch(baseApi.analytics.getProjectAnalytics, "data", {
	immediate: true,
	pathParams,
});

const { state: workload } = useFetch(baseApi.analytics.getProjectWorkload, "data", {
	immediate: true,
	pathParams,
});

const cards = computed(() => [
	{ key: "total", label: translate("analytics.total"), value: overview.value?.total ?? 0 },
	{ key: "completed", label: translate("analytics.completed"), value: overview.value?.completed ?? 0 },
	{ key: "overdue", label: translate("analytics.overdue"), value: overview.value?.overdue ?? 0 },
	{
		key: "onTime",
		label: translate("analytics.onTime"),
		value: `${Math.round((overview.value?.onTimeRate ?? 0) * 100)}%`,
	},
	{ key: "avg", label: translate("analytics.avgDuration"), value: hours(overview.value?.averageDurationHours) },
	{ key: "median", label: translate("analytics.medianDuration"), value: hours(overview.value?.medianDurationHours) },
]);

/** Фактическая длительность: 0 значит «ещё нет закрытых задач с началом работы» */
function hours(value?: number) {
	return value ? `${Math.round(value)} ${translate("forecast.hours")}` : "—";
}

const statusItems = computed(() =>
	Object.entries(overview.value?.byStatus ?? {})
		.sort(([a], [b]) => (STATUS_RANK[a] ?? 0) - (STATUS_RANK[b] ?? 0))
		.map(([status, count]) => ({ key: status, label: statusLabel(status), value: Number(count) })),
);

const workloadItems = computed(() =>
	((workload.value ?? []) as WorkloadItem[]).map((item) => ({
		key: item.userId,
		label: item.fullName,
		value: item.activeTasks,
	})),
);

const workloadColumns = computed(() => [
	{ key: "fullName", label: translate("users.fullName") },
	{ key: "activeTasks", label: translate("project.tasks") },
	{ key: "forecastHours", label: translate("analytics.forecastHours") },
]);
</script>

<template>
	<section class="project-analytics">
		<h3>{{ translate("project.analytics") }}</h3>
		<div class="project-analytics__cards">
			<base-card v-for="card in cards" :key="card.key" class="project-analytics__card">
				<span>{{ card.label }}</span>
				<strong>{{ card.value }}</strong>
			</base-card>
		</div>
		<h4>{{ translate("analytics.byStatus") }}</h4>
		<base-bar-chart :items="statusItems" :label="translate('analytics.byStatus')" />
		<project-risk-analytics :project-id="projectId" />
		<h4>{{ translate("analytics.workload") }}</h4>
		<base-bar-chart
			class="project-analytics__workload-chart"
			:items="workloadItems"
			:label="translate('analytics.workload')"
		/>
		<base-table code="project-workload" :rows="workload || []" :columns="workloadColumns" row-key="userId">
			<template #fullName="{ row }">
				<base-user-name :user="row" />
			</template>
			<template #forecastHours="{ row }">{{ hours(row.forecastHours) }}</template>
		</base-table>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.project-analytics {
	h3,
	h4 {
		margin: 0 0 map.get($spacers, 4);
	}

	h4 {
		margin-top: map.get($spacers, 6);
	}

	&__workload-chart {
		margin-bottom: map.get($spacers, 4);
	}

	&__cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: map.get($spacers, 4);
	}

	&__card {
		padding: map.get($spacers, 4);

		span {
			display: block;
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 8);
		}

		strong {
			font-size: map.get($font-sizes, 3);
		}
	}
}
</style>
