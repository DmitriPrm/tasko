<script lang="ts" setup>
import { computed } from "vue";

export interface BarChartItem {
	key: string;
	label: string;
	value: number;
}

/**
 * Горизонтальная столбчатая диаграмма для одной величины (например, задачи по статусам).
 * Один цвет — серия одна, поэтому легенда не нужна: подписи и значения стоят текстом рядом
 * со столбцами. При наведении — подсказка со значением и долей.
 */
const props = withDefaults(
	defineProps<{
		items: BarChartItem[];
		/** Подпись для программ чтения с экрана */
		label: string;
		/** Как показать значение, по умолчанию — число */
		format?: (value: number) => string;
		/** Показывать долю от суммы в подсказке */
		showShare?: boolean;
	}>(),
	{ format: (value: number) => String(value), showShare: true },
);

const max = computed(() => Math.max(0, ...props.items.map((item) => item.value)));
const total = computed(() => props.items.reduce((sum, item) => sum + item.value, 0));

const width = (value: number) => (max.value ? `${(value / max.value) * 100}%` : "0%");
const share = (value: number) => (total.value ? `${Math.round((value / total.value) * 100)}%` : "0%");
const tooltip = (item: BarChartItem) =>
	props.showShare
		? `${item.label}: ${props.format(item.value)} (${share(item.value)})`
		: `${item.label}: ${props.format(item.value)}`;
</script>

<template>
	<ul class="base-bar-chart" :aria-label="label">
		<el-tooltip v-for="item in items" :key="item.key" :content="tooltip(item)" placement="top" :show-after="100">
			<li class="base-bar-chart__row" tabindex="0" :aria-label="tooltip(item)">
				<span class="base-bar-chart__label">{{ item.label }}</span>
				<span class="base-bar-chart__track">
					<span v-if="item.value > 0" class="base-bar-chart__bar" :style="{ width: width(item.value) }" />
				</span>
				<span class="base-bar-chart__value">{{ format(item.value) }}</span>
			</li>
		</el-tooltip>
	</ul>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.base-bar-chart {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin: 0;
	padding: 0;
	list-style: none;

	&__row {
		display: grid;
		grid-template-columns: minmax(90px, 160px) 1fr minmax(40px, auto);
		align-items: center;
		gap: map.get($spacers, 3);
		padding: map.get($spacers, 1) map.get($spacers, 2);
		border-radius: var(--mt-radius-sm);
		font-size: map.get($font-sizes, 7);
		outline: none;

		&:hover,
		&:focus-visible {
			background: var(--mt-color-gray-50);
		}

		&:focus-visible {
			box-shadow: 0 0 0 2px var(--mt-color-primary-light);
		}
	}

	&__label {
		overflow: hidden;
		color: var(--mt-color-gray-600);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__track {
		display: block;
		height: 16px;
	}

	/* Тонкий столбец от общей базовой линии, скругление только на конце со значением */
	&__bar {
		display: block;
		height: 100%;
		min-width: 2px;
		border-radius: 0 4px 4px 0;
		background: var(--mt-color-primary);
	}

	&__value {
		color: var(--mt-color-text);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
}
</style>
