<script lang="ts" setup>
import { computed, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { RiskAnalytics, WorkloadItem } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { useOnTaskChange } from "@/shared/lib/composable/useOnTaskChange";
import { percent, RISK_LEVELS, type RiskLevel, riskTagType } from "@/shared/lib/helpers/forecast";
import { formatDate } from "@/shared/lib/helpers/formatDate";
import { STATUS_RANK, statusLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import BaseBarChart from "@/shared/ui/chart/BaseBarChart.vue";
import BaseTable from "@/shared/ui/table/BaseTable.vue";
import BaseTooltip from "@/shared/ui/tooltip/BaseTooltip.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";
import { useTaskDrawerStore } from "@/store/taskDrawer";

type RiskTask = RiskAnalytics["tasks"][number];
type DurationRow = RiskAnalytics["durations"]["rows"][number];

/**
 * Аналитика проекта в духе дашбордов Jira: сверху ключевые числа, ниже три виджета в ряд,
 * подробные таблицы — во вкладках внизу, а не одной длинной лентой.
 */
const props = defineProps<{
	projectId: string;
}>();

const taskDrawer = useTaskDrawerStore();
const pathParams = computed(() => ({ id: props.projectId }));

const { state: overview, fetch: fetchOverview } = useFetch(baseApi.analytics.getProjectAnalytics, "data", {
	immediate: true,
	pathParams,
});
const { state: workloadState, fetch: fetchWorkload } = useFetch(baseApi.analytics.getProjectWorkload, "data", {
	immediate: true,
	pathParams,
});
const { state: risksState, fetch: fetchRisks } = useFetch(baseApi.analytics.getProjectRisks, "data", {
	immediate: true,
	pathParams,
});

useOnTaskChange({
	reload: async () => {
		await Promise.all([fetchOverview(), fetchWorkload(), fetchRisks()]);
	},
});

const workload = computed(() => (workloadState.value ?? []) as WorkloadItem[]);
const risks = computed(() => risksState.value as RiskAnalytics | undefined);

const hours = (value?: number | null) =>
	value === null || value === undefined || value === 0 ? "—" : `${Math.round(value)} ${translate("forecast.hours")}`;
const signedHours = (value: number | null) =>
	value === null
		? "—"
		: `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(Math.round(value))} ${translate("forecast.hours")}`;

const openCount = computed(() => {
	const byStatus = overview.value?.byStatus ?? {};
	return (byStatus.TODO ?? 0) + (byStatus.IN_PROGRESS ?? 0) + (byStatus.REVIEW ?? 0);
});

/** Ключевые числа: то, на что руководитель смотрит первым */
const kpis = computed(() => [
	{
		key: "open",
		label: translate("analytics.open"),
		value: openCount.value,
		hint: `${translate("analytics.total")}: ${overview.value?.total ?? 0}`,
	},
	{
		key: "overdue",
		label: translate("analytics.overdue"),
		value: overview.value?.overdue ?? 0,
		tone: overview.value?.overdue ? "danger" : "",
	},
	{
		key: "highRisk",
		label: translate("analytics.highRisk"),
		value: risks.value?.byRisk.HIGH ?? 0,
		tone: risks.value?.byRisk.HIGH ? "warning" : "",
	},
	{
		key: "onTime",
		label: translate("analytics.onTime"),
		value: `${Math.round((overview.value?.onTimeRate ?? 0) * 100)}%`,
		hint: `${translate("analytics.completed")}: ${overview.value?.completed ?? 0}`,
	},
	{
		key: "duration",
		label: translate("analytics.avgDuration"),
		value: hours(overview.value?.averageDurationHours),
		hint: `${translate("analytics.median")}: ${hours(overview.value?.medianDurationHours)}`,
	},
]);

const statusItems = computed(() =>
	Object.entries(overview.value?.byStatus ?? {})
		.sort(([a], [b]) => (STATUS_RANK[a] ?? 0) - (STATUS_RANK[b] ?? 0))
		.map(([status, count]) => ({ key: status, label: statusLabel(status), value: Number(count) })),
);

const workloadItems = computed(() =>
	workload.value.map((item) => ({ key: item.userId, label: item.fullName, value: item.activeTasks })),
);

// Подробности — во вкладках; уровень риска из виджета открывает нужный список
const detailsTab = ref("risks");
const riskLevel = ref<RiskLevel | "">("");
const riskTotal = computed(() => RISK_LEVELS.reduce((sum, level) => sum + (risks.value?.byRisk[level] ?? 0), 0));

const handleRiskLevel = (level: RiskLevel) => {
	riskLevel.value = riskLevel.value === level ? "" : level;
	detailsTab.value = "risks";
};

const riskTasks = computed(() =>
	(risks.value?.tasks ?? []).filter((task) => !riskLevel.value || task.riskLevel === riskLevel.value),
);

const riskColumns = computed(() => [
	{ key: "title", label: translate("task.name") },
	{ key: "risk", label: translate("forecast.risk"), sortValue: (row: RiskTask) => row.riskProbability },
	{ key: "deadlineAt", label: translate("task.deadline"), sortValue: (row: RiskTask) => row.deadlineAt ?? "" },
	{ key: "assignee", label: translate("task.assignee") },
]);

const durationColumns = computed(() => [
	{ key: "title", label: translate("task.name") },
	{
		key: "plannedHours",
		label: translate("riskAnalytics.planned"),
		sortValue: (r: DurationRow) => r.plannedHours ?? -1,
	},
	{
		key: "predictedHours",
		label: translate("riskAnalytics.predicted"),
		sortValue: (r: DurationRow) => r.predictedHours ?? -1,
	},
	{ key: "actualHours", label: translate("riskAnalytics.actual"), sortValue: (r: DurationRow) => r.actualHours ?? -1 },
	{
		key: "errorHours",
		label: translate("riskAnalytics.error"),
		sortValue: (r: DurationRow) => Math.abs(r.errorHours ?? 0),
	},
]);

const workloadColumns = computed(() => [
	{ key: "fullName", label: translate("users.fullName") },
	{ key: "activeTasks", label: translate("project.tasks") },
	{ key: "forecastHours", label: translate("analytics.forecastHours") },
]);

const durationSummary = computed(() => risks.value?.durations.summary);
</script>

<template>
	<section class="project-analytics">
		<div class="project-analytics__kpis">
			<base-card
				v-for="kpi in kpis"
				:key="kpi.key"
				class="project-analytics__kpi"
				:class="kpi.tone ? `project-analytics__kpi--${kpi.tone}` : ''"
			>
				<span class="project-analytics__kpi-label">{{ kpi.label }}</span>
				<strong class="project-analytics__kpi-value">{{ kpi.value }}</strong>
				<span v-if="kpi.hint" class="project-analytics__kpi-hint">{{ kpi.hint }}</span>
			</base-card>
		</div>

		<div class="project-analytics__widgets">
			<base-card class="project-analytics__widget">
				<h4>{{ translate("analytics.byStatus") }}</h4>
				<base-bar-chart :items="statusItems" :label="translate('analytics.byStatus')" />
			</base-card>

			<base-card class="project-analytics__widget">
				<base-flex align="center" :gap="2">
					<h4>{{ translate("riskAnalytics.title") }}</h4>
					<base-tooltip :content="translate('riskAnalytics.titleInfo')" />
				</base-flex>
				<ul class="project-analytics__levels">
					<li v-for="level in RISK_LEVELS" :key="level">
						<button
							type="button"
							class="project-analytics__level"
							:class="[`project-analytics__level--${level.toLowerCase()}`, { 'is-active': riskLevel === level }]"
							:aria-pressed="riskLevel === level"
							@click="() => handleRiskLevel(level)"
						>
							<span class="project-analytics__level-name">{{ translate(`forecast.${level.toLowerCase()}`) }}</span>
							<span class="project-analytics__level-track">
								<span
									v-if="risks?.byRisk[level]"
									class="project-analytics__level-bar"
									:style="{ width: riskTotal ? `${((risks?.byRisk[level] ?? 0) / riskTotal) * 100}%` : '0%' }"
								/>
							</span>
							<strong>{{ risks?.byRisk[level] ?? 0 }}</strong>
						</button>
					</li>
				</ul>
				<p class="project-analytics__muted">{{ translate("riskAnalytics.levelHint") }}</p>
			</base-card>

			<base-card class="project-analytics__widget">
				<h4>{{ translate("analytics.workload") }}</h4>
				<base-bar-chart
					v-if="workloadItems.length"
					:items="workloadItems"
					:label="translate('analytics.workload')"
					:show-share="false"
				/>
				<p v-else class="project-analytics__muted">{{ translate("common.empty") }}</p>
			</base-card>
		</div>

		<base-card class="project-analytics__details">
			<el-tabs v-model="detailsTab">
				<el-tab-pane name="risks">
					<template #label>
						{{ translate("riskAnalytics.riskyTasks") }}
						<span v-if="riskLevel" class="project-analytics__tab-filter">
							· {{ translate(`forecast.${riskLevel.toLowerCase()}`) }}
						</span>
					</template>
					<base-table
						code="project-risk-tasks"
						:rows="riskTasks"
						:columns="riskColumns"
						:empty-text="translate('riskAnalytics.noTasks')"
						@row-click="(row: RiskTask) => taskDrawer.open(row.id)"
					>
						<template #risk="{ row }">
							<el-tag :type="riskTagType[row.riskLevel as RiskLevel]" size="small">
								{{ translate(`forecast.${row.riskLevel.toLowerCase()}`) }} · {{ percent(row.riskProbability) }}
							</el-tag>
						</template>
						<template #deadlineAt="{ row }">{{ formatDate(row.deadlineAt) || "—" }}</template>
						<template #assignee="{ row }">
							<base-user-name v-if="row.assignee" :user="row.assignee" />
							<span v-else>—</span>
						</template>
					</base-table>
				</el-tab-pane>

				<el-tab-pane :label="translate('riskAnalytics.durations')" name="durations">
					<base-flex v-if="durationSummary" class="project-analytics__summary" :gap="6" wrap="wrap">
						<span
							>{{ translate("riskAnalytics.avgPlanned") }}:
							<strong>{{ hours(durationSummary.avgPlannedHours) }}</strong></span
						>
						<span
							>{{ translate("riskAnalytics.avgPredicted") }}:
							<strong>{{ hours(durationSummary.avgPredictedHours) }}</strong></span
						>
						<span
							>{{ translate("riskAnalytics.avgActual") }}:
							<strong>{{ hours(durationSummary.avgActualHours) }}</strong></span
						>
						<span
							>{{ translate("riskAnalytics.mae") }}: <strong>{{ hours(durationSummary.maeHours) }}</strong></span
						>
						<base-tooltip :content="translate('riskAnalytics.durationsInfo')" />
					</base-flex>
					<base-table
						code="project-risk-durations"
						:rows="risks?.durations.rows ?? []"
						:columns="durationColumns"
						row-key="taskId"
						:empty-text="translate('riskAnalytics.noClosed')"
						@row-click="(row: DurationRow) => taskDrawer.open(row.taskId)"
					>
						<template #plannedHours="{ row }">{{ hours(row.plannedHours) }}</template>
						<template #predictedHours="{ row }">{{ hours(row.predictedHours) }}</template>
						<template #actualHours="{ row }">{{ hours(row.actualHours) }}</template>
						<template #errorHours="{ row }">{{ signedHours(row.errorHours) }}</template>
					</base-table>
				</el-tab-pane>

				<el-tab-pane :label="translate('analytics.workload')" name="workload">
					<base-table code="project-workload" :rows="workload" :columns="workloadColumns" row-key="userId">
						<template #fullName="{ row }">
							<base-user-name :user="row" />
						</template>
						<template #forecastHours="{ row }">{{ hours(row.forecastHours) }}</template>
					</base-table>
				</el-tab-pane>
			</el-tabs>
		</base-card>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.project-analytics {
	display: flex;
	flex-direction: column;
	gap: map.get($spacers, 5);

	h4 {
		margin: 0 0 map.get($spacers, 3);
		font-size: map.get($font-sizes, 6);
		font-weight: 650;
	}

	&__kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: map.get($spacers, 4);
	}

	&__kpi {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: map.get($spacers, 4);
		border-top: 3px solid transparent;

		&--danger {
			border-top-color: var(--mt-color-danger);
		}

		&--warning {
			border-top-color: var(--mt-color-warning);
		}
	}

	&__kpi-label,
	&__kpi-hint {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}

	&__kpi-label {
		font-weight: 600;
	}

	&__kpi-value {
		font-size: map.get($font-sizes, 2);
		font-variant-numeric: tabular-nums;
		line-height: 1.2;
	}

	&__widgets {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: map.get($spacers, 4);
	}

	&__widget {
		padding: map.get($spacers, 4) map.get($spacers, 5);
	}

	&__levels {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	&__level {
		display: grid;
		grid-template-columns: minmax(70px, 38%) 1fr 32px;
		align-items: center;
		gap: map.get($spacers, 3);
		width: 100%;
		padding: map.get($spacers, 2);
		border: 0;
		border-radius: var(--mt-radius-sm);
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: map.get($font-sizes, 7);
		text-align: left;
		cursor: pointer;

		strong {
			text-align: right;
			font-variant-numeric: tabular-nums;
		}

		&:hover {
			background: var(--mt-color-gray-50);
		}

		&.is-active {
			background: var(--mt-color-primary-light);
		}

		&--high .project-analytics__level-bar {
			background: var(--mt-color-danger);
		}

		&--medium .project-analytics__level-bar {
			background: var(--mt-color-warning);
		}

		&--low .project-analytics__level-bar {
			background: var(--mt-color-success);
		}
	}

	&__level-name {
		color: var(--mt-color-gray-600);
	}

	&__level-track {
		display: block;
		height: 16px;
	}

	&__level-bar {
		display: block;
		height: 100%;
		min-width: 2px;
		border-radius: 0 4px 4px 0;
	}

	&__muted {
		margin: map.get($spacers, 3) 0 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}

	&__details {
		padding: map.get($spacers, 2) map.get($spacers, 5) map.get($spacers, 5);
	}

	&__tab-filter {
		color: var(--mt-color-primary);
	}

	&__summary {
		margin-bottom: map.get($spacers, 4);
		color: var(--mt-color-gray-600);
		font-size: map.get($font-sizes, 7);
	}
}
</style>
