<script lang="ts" setup>
import { computed, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { RiskAnalytics } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { useOnTaskChange } from "@/shared/lib/composable/useOnTaskChange";
import { percent, RISK_LEVELS, type RiskLevel, riskTagType } from "@/shared/lib/helpers/forecast";
import { formatDate } from "@/shared/lib/helpers/formatDate";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import BaseTable from "@/shared/ui/table/BaseTable.vue";
import BaseTooltip from "@/shared/ui/tooltip/BaseTooltip.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";
import { useTaskDrawerStore } from "@/store/taskDrawer";

type RiskTask = RiskAnalytics["tasks"][number];
type DurationRow = RiskAnalytics["durations"]["rows"][number];

const props = defineProps<{
	projectId: string;
}>();

const taskDrawer = useTaskDrawerStore();

const { state, fetch } = useFetch(baseApi.analytics.getProjectRisks, "data", {
	immediate: true,
	pathParams: computed(() => ({ id: props.projectId })),
});

useOnTaskChange({ reload: () => fetch() });

const data = computed(() => state.value as RiskAnalytics | undefined);

/** Выбранный уровень: клик по карточке показывает задачи этого уровня */
const level = ref<RiskLevel | "">("HIGH");
const handleLevel = (value: RiskLevel) => {
	level.value = level.value === value ? "" : value;
};

const tasks = computed(() =>
	(data.value?.tasks ?? []).filter((task) => !level.value || task.riskLevel === level.value),
);

const hours = (value: number | null | undefined) =>
	value === null || value === undefined ? "—" : `${Math.round(value)} ${translate("forecast.hours")}`;
const signedHours = (value: number | null) =>
	value === null
		? "—"
		: `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(Math.round(value))} ${translate("forecast.hours")}`;

const taskColumns = computed(() => [
	{ key: "title", label: translate("task.name") },
	{ key: "risk", label: translate("forecast.risk"), sortValue: (row: RiskTask) => row.riskProbability },
	{ key: "deadlineAt", label: translate("task.deadline") },
	{ key: "assignee", label: translate("task.assignee") },
]);

const durationColumns = computed(() => [
	{ key: "title", label: translate("task.name") },
	{
		key: "plannedHours",
		label: translate("riskAnalytics.planned"),
		sortValue: (row: DurationRow) => row.plannedHours ?? -1,
	},
	{
		key: "predictedHours",
		label: translate("riskAnalytics.predicted"),
		sortValue: (row: DurationRow) => row.predictedHours ?? -1,
	},
	{
		key: "actualHours",
		label: translate("riskAnalytics.actual"),
		sortValue: (row: DurationRow) => row.actualHours ?? -1,
	},
	{
		key: "errorHours",
		label: translate("riskAnalytics.error"),
		sortValue: (row: DurationRow) => Math.abs(row.errorHours ?? 0),
	},
]);

const summary = computed(() => data.value?.durations.summary);
</script>

<template>
	<section v-if="data" class="project-risk-analytics">
		<base-flex align="center" :gap="2">
			<h4>{{ translate("riskAnalytics.title") }}</h4>
			<base-tooltip :content="translate('riskAnalytics.titleInfo')" />
		</base-flex>

		<div class="project-risk-analytics__levels">
			<button
				v-for="item in RISK_LEVELS"
				:key="item"
				type="button"
				class="project-risk-analytics__level"
				:class="[`project-risk-analytics__level--${item.toLowerCase()}`, { 'is-active': level === item }]"
				:aria-pressed="level === item"
				@click="() => handleLevel(item)"
			>
				<span>{{ translate(`forecast.${item.toLowerCase()}`) }}</span>
				<strong>{{ data.byRisk[item] }}</strong>
			</button>
		</div>

		<base-table
			code="project-risk-tasks"
			:rows="tasks"
			:columns="taskColumns"
			:empty-text="translate('riskAnalytics.noTasks')"
			@row-click="(row: RiskTask) => taskDrawer.open(row.id)"
		>
			<template #risk="{ row }">
				<el-tag :type="riskTagType[row.riskLevel as RiskLevel]" size="small">{{ percent(row.riskProbability) }}</el-tag>
			</template>
			<template #deadlineAt="{ row }">{{ formatDate(row.deadlineAt) || "—" }}</template>
			<template #assignee="{ row }">
				<base-user-name v-if="row.assignee" :user="row.assignee" />
				<span v-else>—</span>
			</template>
		</base-table>

		<base-flex align="center" :gap="2" class="project-risk-analytics__subtitle">
			<h4>{{ translate("riskAnalytics.durations") }}</h4>
			<base-tooltip :content="translate('riskAnalytics.durationsInfo')" />
		</base-flex>

		<base-flex v-if="summary" :gap="4" wrap="wrap">
			<base-card class="project-risk-analytics__card">
				<span>{{ translate("riskAnalytics.avgPlanned") }}</span>
				<strong>{{ hours(summary.avgPlannedHours) }}</strong>
			</base-card>
			<base-card class="project-risk-analytics__card">
				<span>{{ translate("riskAnalytics.avgPredicted") }}</span>
				<strong>{{ hours(summary.avgPredictedHours) }}</strong>
			</base-card>
			<base-card class="project-risk-analytics__card">
				<span>{{ translate("riskAnalytics.avgActual") }}</span>
				<strong>{{ hours(summary.avgActualHours) }}</strong>
			</base-card>
			<base-card class="project-risk-analytics__card">
				<span>{{ translate("riskAnalytics.mae") }}</span>
				<strong>{{ hours(summary.maeHours) }}</strong>
			</base-card>
		</base-flex>

		<base-table
			code="project-risk-durations"
			:rows="data.durations.rows"
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
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.project-risk-analytics {
	display: flex;
	flex-direction: column;
	gap: map.get($spacers, 4);
	margin-top: map.get($spacers, 6);

	h4 {
		margin: 0;
	}

	&__subtitle {
		margin-top: map.get($spacers, 4);
	}

	&__levels {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: map.get($spacers, 3);
	}

	&__level {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: map.get($spacers, 1);
		padding: map.get($spacers, 3) map.get($spacers, 4);
		border: 1px solid var(--mt-color-gray-200);
		border-left-width: 4px;
		border-radius: var(--mt-radius-sm);
		background: var(--mt-color-white);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: box-shadow 0.15s var(--mt-ease);

		span {
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 8);
			font-weight: 600;
		}

		strong {
			font-size: map.get($font-sizes, 3);
		}

		&:hover {
			box-shadow: var(--mt-shadow-hover);
		}

		&--high {
			border-left-color: var(--mt-color-danger);
		}

		&--medium {
			border-left-color: var(--mt-color-warning);
		}

		&--low {
			border-left-color: var(--mt-color-success);
		}

		&.is-active {
			background: var(--mt-color-primary-light);
		}
	}

	&__card {
		min-width: 160px;
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
