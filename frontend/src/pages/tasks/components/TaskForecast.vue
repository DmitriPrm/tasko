<script lang="ts" setup>
import { ElMessage } from "element-plus";
import { computed, ref, watch } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { TaskForecast } from "@/shared/api/v0/schemas";
import { formatDateTime } from "@/shared/lib/helpers/formatDate";
import { i18n, translate } from "@/shared/lib/theming/i18n/translate";

type Factor = TaskForecast["riskFactors"][number];

const emit = defineEmits<{
	refreshed: [];
}>();

const props = defineProps<{
	taskId: string;
	forecast?: TaskForecast | null;
}>();

const current = ref<TaskForecast | null>(props.forecast ?? null);
const isRefreshing = ref(false);

watch(
	() => props.forecast,
	(value) => {
		current.value = value ?? null;
	},
);

const riskTagType = { LOW: "success", MEDIUM: "warning", HIGH: "danger" } as const;
const riskLabel = computed(() => (current.value ? translate(`forecast.${current.value.riskLevel.toLowerCase()}`) : ""));
const percent = (value: number) => `${Math.round(value * 100)}%`;

const durationText = computed(() => {
	if (!current.value) return "";
	const hours = current.value.durationHours ?? current.value.durationDays * 24;
	const h = translate("forecast.hours");
	if (hours < 24) return `≈ ${Math.max(1, Math.round(hours))} ${h}`;
	return `≈ ${Math.round(hours / 24)} ${translate("forecast.days")} (${Math.round(hours)} ${h})`;
});

const isMl = computed(() => current.value?.source === "ML");
const modelVersion = computed(() => current.value?.models?.risk || current.value?.models?.duration || "");

/** Признаки «да/нет»: при значении 0 пишем «Нет исполнителя», а не «Есть исполнитель» */
const NEGATED = new Set(["has_deadline", "has_planned_start", "has_assignee", "is_subtask"]);

/** Подпись признака: перевод по ключу, иначе подпись от ML-сервиса */
const factorLabel = (factor: Factor) => {
	const negated = NEGATED.has(factor.feature) && factor.value === 0;
	const key = `forecast.${negated ? "featureNot" : "feature"}.${factor.feature}`;
	const label = i18n.global.te(key) ? translate(key) : factor.label;
	return factor.value === null ? `${label} (${translate("forecast.noData")})` : label;
};

// Вклады меньше 0,5 п.п. риска или получаса работы — шум: не показываем
const riskFactors = computed(() => (current.value?.riskFactors ?? []).filter((item) => Math.abs(item.impact) >= 0.005));
const durationFactors = computed(() =>
	(current.value?.durationFactors ?? []).filter((item) => Math.abs(item.impact) >= 0.5),
);

const riskImpact = (factor: Factor) => `${factor.impact > 0 ? "+" : "−"}${Math.abs(Math.round(factor.impact * 100))}%`;
const durationImpact = (factor: Factor) =>
	`${factor.impact > 0 ? "+" : "−"}${Math.abs(Math.round(factor.impact))} ${translate("forecast.hours")}`;
const impactTitle = (factor: Factor) => translate(factor.impact > 0 ? "forecast.raises" : "forecast.lowers");

const handleRefresh = async () => {
	isRefreshing.value = true;
	try {
		const response = await baseApi.tasks.refreshTaskPrediction({ id: props.taskId });
		const result = response.data?.data;
		if (!result) return;
		current.value = result.forecast;
		ElMessage({
			type: result.refreshed ? "success" : "warning",
			message: translate(result.refreshed ? "forecast.refreshed" : "forecast.unavailable"),
		});
		if (result.refreshed) emit("refreshed");
	} finally {
		isRefreshing.value = false;
	}
};
</script>

<template>
	<section v-if="current" class="task-forecast">
		<base-flex align="center" justify="space-between" :gap="3">
			<base-flex align="center" :gap="2">
				<h3>{{ translate("forecast.title") }}</h3>
				<span class="task-forecast__source" :class="{ 'task-forecast__source--ml': isMl }">
					{{ translate(isMl ? "forecast.sourceMl" : "forecast.sourceRules") }}
				</span>
			</base-flex>
			<base-button text type="primary" :loading="isRefreshing" @click="handleRefresh">
				{{ translate("forecast.refresh") }}
			</base-button>
		</base-flex>

		<div class="task-forecast__grid">
			<div class="task-forecast__metric">
				<span class="task-forecast__caption">{{ translate("forecast.risk") }}</span>
				<base-flex align="center" :gap="2">
					<el-tag :type="riskTagType[current.riskLevel]" size="small">{{ riskLabel }}</el-tag>
					<strong>{{ percent(current.riskProbability) }}</strong>
				</base-flex>
			</div>
			<div class="task-forecast__metric">
				<span class="task-forecast__caption">{{ translate("forecast.duration") }}</span>
				<strong>{{ durationText }}</strong>
			</div>
		</div>

		<ul v-if="current.factors.length" class="task-forecast__notes">
			<li v-for="code in current.factors" :key="code">{{ translate(`forecast.factor.${code}`) }}</li>
		</ul>

		<template v-if="isMl">
			<div v-if="riskFactors.length" class="task-forecast__factors">
				<span class="task-forecast__caption">{{ translate("forecast.riskFactors") }}</span>
				<ul>
					<li v-for="factor in riskFactors" :key="factor.feature">
						<span>{{ factorLabel(factor) }}</span>
						<span
							class="task-forecast__impact"
							:class="factor.impact > 0 ? 'task-forecast__impact--up' : 'task-forecast__impact--down'"
							:title="impactTitle(factor)"
						>
							{{ riskImpact(factor) }}
						</span>
					</li>
				</ul>
			</div>
			<div v-if="durationFactors.length" class="task-forecast__factors">
				<span class="task-forecast__caption">{{ translate("forecast.durationFactors") }}</span>
				<ul>
					<li v-for="factor in durationFactors" :key="factor.feature">
						<span>{{ factorLabel(factor) }}</span>
						<span
							class="task-forecast__impact"
							:class="factor.impact > 0 ? 'task-forecast__impact--up' : 'task-forecast__impact--down'"
							:title="impactTitle(factor)"
						>
							{{ durationImpact(factor) }}
						</span>
					</li>
				</ul>
			</div>
		</template>
		<p v-else class="task-forecast__hint">{{ translate("forecast.rulesHint") }}</p>

		<p class="task-forecast__meta">
			{{ translate("forecast.calculatedAt") }}: {{ formatDateTime(current.calculatedAt) }}
			<template v-if="modelVersion"> · {{ translate("forecast.model") }}: {{ modelVersion }}</template>
		</p>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.task-forecast {
	display: flex;
	flex-direction: column;
	gap: map.get($spacers, 3);

	h3 {
		margin: 0;
		font-size: map.get($font-sizes, 6);
		font-weight: 600;
	}

	&__source {
		padding: 1px map.get($spacers, 2);
		border-radius: 6px;
		background: var(--mt-color-gray-50);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;

		&--ml {
			background: var(--mt-color-primary-light);
			color: var(--mt-color-primary);
		}
	}

	&__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: map.get($spacers, 3);
	}

	&__metric {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 1);
		padding: map.get($spacers, 3);
		border: 1px solid var(--mt-color-gray-100);
		border-radius: var(--mt-radius-sm);
	}

	&__caption {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
	}

	&__notes {
		margin: 0;
		padding-left: map.get($spacers, 4);
		color: var(--mt-color-gray-600);
		font-size: map.get($font-sizes, 7);
	}

	&__factors ul {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 1);
		margin: map.get($spacers, 1) 0 0;
		padding: 0;
		list-style: none;

		li {
			display: flex;
			justify-content: space-between;
			gap: map.get($spacers, 3);
			font-size: map.get($font-sizes, 7);
		}
	}

	&__impact {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;

		&--up {
			color: var(--mt-color-danger);
		}

		&--down {
			color: var(--mt-color-success);
		}
	}

	&__hint,
	&__meta {
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}
}
</style>
