<script lang="ts" setup>
import { computed } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { statusLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
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
]);

const workloadColumns = computed(() => [
	{ key: "fullName", label: translate("users.fullName") },
	{ key: "activeTasks", label: translate("project.tasks") },
]);

</script>

<template>
	<section class="project-analytics">
		<h3>{{ translate("project.analytics") }}</h3>
		<base-flex :gap="4" wrap="wrap">
			<base-card v-for="card in cards" :key="card.key" class="project-analytics__card">
				<span>{{ card.label }}</span>
				<strong>{{ card.value }}</strong>
			</base-card>
		</base-flex>
		<h4>{{ translate("analytics.byStatus") }}</h4>
		<base-flex :gap="3" wrap="wrap">
			<el-tag v-for="(count, status) in overview?.byStatus || {}" :key="status">
				{{ statusLabel(String(status)) }}: {{ count }}
			</el-tag>
		</base-flex>
		<h4>{{ translate("analytics.workload") }}</h4>
		<base-table code="project-workload" :rows="workload || []" :columns="workloadColumns" row-key="userId">
			<template #fullName="{ row }">
				<base-user-name :user="row" />
			</template>
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
