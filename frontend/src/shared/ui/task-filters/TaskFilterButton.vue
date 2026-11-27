<script lang="ts" setup>
import { Filter as FilterIcon } from "@/shared/ui/icon/icons";

import type { TaskPriority, TaskType, User } from "@/shared/api/v0/schemas";
import type { TaskFilterField, TaskFilters } from "@/shared/lib/composable/useTaskFilters";
import { RISK_LEVELS } from "@/shared/lib/helpers/forecast";
import { DEADLINE_FILTERS } from "@/shared/lib/helpers/formatDate";
import { priorityLabel, statusLabel, typeLabel } from "@/shared/lib/helpers/labels";
import { BOARD_COLUMNS } from "@/shared/lib/helpers/taskTransitions";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseUserSelect from "@/shared/ui/select/BaseUserSelect.vue";

/**
 * Кнопка «Фильтры» со счётчиком и панелью: все фильтры в одном месте, сверху вниз, с подписями.
 * fields — какие фильтры нужны на этой странице и в каком порядке.
 */
const props = defineProps<{
	filters: TaskFilters;
	fields: TaskFilterField[];
	users?: User[];
	tags?: { id: string; name: string; color?: string }[];
	projects?: { id: string; name: string }[];
	/** Куда раскрывать панель: у кнопки в правом углу — влево (bottom-end) */
	placement?: "bottom-start" | "bottom-end";
}>();

const states = ["open", "closed", "all"] as const;
const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const types: TaskType[] = ["TASK", "FEATURE", "BUG", "RESEARCH"];

const label = (field: TaskFilterField) => translate(`filters.field.${field}`);
const update = (field: TaskFilterField, value: unknown) =>
	props.filters.set(field, (Array.isArray(value) ? value[0] : value) as never);
</script>

<template>
	<el-popover trigger="click" :placement="placement || 'bottom-start'" :width="320" popper-class="task-filter-popover">
		<template #reference>
			<base-button class="task-filter-button" :class="{ 'is-active': filters.count.value }">
				<base-flex align="center" :gap="1">
					<el-icon :size="16" aria-hidden="true"><filter-icon /></el-icon>
					<span>{{ translate("common.filters") }}</span>
					<span v-if="filters.count.value" class="task-filter-button__count">{{ filters.count.value }}</span>
				</base-flex>
			</base-button>
		</template>

		<div class="task-filter-panel">
			<base-flex align="center" justify="space-between">
				<strong>{{ translate("common.filters") }}</strong>
				<base-button v-if="filters.count.value" text type="primary" size="small" @click="filters.reset">
					{{ translate("filters.resetAll") }}
				</base-button>
			</base-flex>

			<el-form label-position="top" class="task-filter-panel__form" @submit.prevent>
				<template v-for="field in fields" :key="field">
					<el-form-item v-if="field === 'state'" :label="label(field)">
						<el-segmented
							:model-value="filters.state.state"
							:options="states.map((value) => ({ value, label: translate(`filters.state.${value}`) }))"
							block
							@change="(value: string) => update('state', value)"
						/>
					</el-form-item>

					<el-form-item v-else-if="field === 'assigneeId'" :label="label(field)">
						<base-user-select
							:model-value="filters.state.assigneeId"
							:users="users || []"
							clearable
							:teleported="false"
							:placeholder="translate('filters.any')"
							@update:model-value="(value) => update('assigneeId', value)"
						/>
					</el-form-item>

					<el-form-item v-else :label="label(field)">
						<el-select
							:model-value="filters.state[field]"
							clearable
							filterable
							:teleported="false"
							:placeholder="translate('filters.any')"
							@change="(value: string) => update(field, value)"
						>
							<template v-if="field === 'status'">
								<el-option v-for="item in BOARD_COLUMNS" :key="item" :label="statusLabel(item)" :value="item" />
							</template>
							<template v-else-if="field === 'type'">
								<el-option v-for="item in types" :key="item" :label="typeLabel(item)" :value="item" />
							</template>
							<template v-else-if="field === 'priority'">
								<el-option v-for="item in priorities" :key="item" :label="priorityLabel(item)" :value="item" />
							</template>
							<template v-else-if="field === 'deadline'">
								<el-option
									v-for="item in DEADLINE_FILTERS"
									:key="item"
									:label="translate(`task.deadlineFilter.${item}`)"
									:value="item"
								/>
							</template>
							<template v-else-if="field === 'risk'">
								<el-option
									v-for="item in RISK_LEVELS"
									:key="item"
									:label="translate(`forecast.${item.toLowerCase()}`)"
									:value="item"
								/>
							</template>
							<template v-else-if="field === 'tagId'">
								<el-option v-for="tag in tags || []" :key="tag.id" :label="tag.name" :value="tag.id" />
							</template>
							<template v-else-if="field === 'projectId'">
								<el-option v-for="item in projects || []" :key="item.id" :label="item.name" :value="item.id" />
							</template>
						</el-select>
					</el-form-item>
				</template>
			</el-form>
		</div>
	</el-popover>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.task-filter-button {
	&.is-active {
		border-color: var(--mt-color-primary);
		color: var(--mt-color-primary);
	}

	&__count {
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 9px;
		background: var(--mt-color-primary);
		color: var(--mt-color-white);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
		line-height: 18px;
		text-align: center;
	}
}

.task-filter-panel {
	display: flex;
	flex-direction: column;
	gap: map.get($spacers, 3);

	&__form {
		:deep(.el-form-item) {
			margin-bottom: map.get($spacers, 3);
		}

		:deep(.el-form-item:last-child) {
			margin-bottom: 0;
		}

		:deep(.el-form-item__label) {
			margin-bottom: 2px;
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 8);
			font-weight: 600;
			line-height: 1.4;
		}

		:deep(.el-select),
		:deep(.base-user-select),
		:deep(.el-segmented) {
			width: 100%;
		}

		:deep(.el-segmented__item) {
			flex: 1;
			padding: 0 map.get($spacers, 2);
		}
	}
}

/* Длинная панель не должна вылезать за экран */
:global(.task-filter-popover) {
	max-height: calc(100vh - 120px);
	overflow-y: auto;
}
</style>
