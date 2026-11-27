<script lang="ts" setup>
import type { TaskFilters } from "@/shared/lib/composable/useTaskFilters";
import { translate } from "@/shared/lib/theming/i18n/translate";

/** Строка активных фильтров: видно, что отфильтровано, и любой фильтр снимается одним кликом */
defineProps<{
	filters: TaskFilters;
	/** Сколько задач показано после фильтров */
	shown?: number;
}>();
</script>

<template>
	<base-flex v-if="filters.chips.value.length" class="task-filter-chips" align="center" :gap="2" wrap="wrap">
		<span v-if="shown !== undefined" class="task-filter-chips__count">
			{{ translate("filters.shown") }}: {{ shown }}
		</span>
		<el-tag
			v-for="chip in filters.chips.value"
			:key="chip.field"
			closable
			disable-transitions
			class="task-filter-chips__chip"
			@close="filters.clear(chip.field)"
		>
			{{ chip.label }}
		</el-tag>
		<base-button text type="primary" size="small" @click="filters.reset">
			{{ translate("filters.resetAll") }}
		</base-button>
	</base-flex>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.task-filter-chips {
	margin-bottom: map.get($spacers, 4);

	&__count {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}

	&__chip {
		border-color: var(--mt-color-primary-light);
		background: var(--mt-color-primary-light);
		color: var(--mt-color-primary);
		font-weight: 600;
	}
}
</style>
