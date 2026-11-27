<script lang="ts" setup>
import { computed } from "vue";

import type { TaskForecast } from "@/shared/api/v0/schemas";
import { openTaskForecast, percent, riskLevelLabel, riskTagType } from "@/shared/lib/helpers/forecast";

/** Уровень и вероятность срыва срока для таблиц. У закрытой задачи — прочерк */
const props = defineProps<{
	task: { status: string; isCompleted?: boolean | null; forecast?: TaskForecast | null };
}>();

const forecast = computed(() => openTaskForecast(props.task));
</script>

<template>
	<el-tag v-if="forecast" :type="riskTagType[forecast.riskLevel]" size="small">
		{{ riskLevelLabel(forecast) }} · {{ percent(forecast.riskProbability) }}
	</el-tag>
	<span v-else class="task-risk-tag__empty">—</span>
</template>

<style scoped lang="scss">
.task-risk-tag__empty {
	color: var(--mt-color-gray-400);
}
</style>
