<script lang="ts" setup>
import { Board, List, Search } from "@/shared/ui/icon/icons";

import type { User } from "@/shared/api/v0/schemas";
import type { TaskFilterField, TaskFilters } from "@/shared/lib/composable/useTaskFilters";
import { translate } from "@/shared/lib/theming/i18n/translate";
import TaskFilterButton from "@/shared/ui/task-filters/TaskFilterButton.vue";

export type TasksView = "board" | "list";
export type TasksSort = "default" | "risk" | "deadline";

/** Поиск, фильтры и порядок — слева; переключатель «доска / список» — справа */
const emit = defineEmits<{
	"update:search": [value: string];
	"update:view": [value: TasksView];
	"update:sort": [value: TasksSort];
}>();

defineProps<{
	search: string;
	view: TasksView;
	sort: TasksSort;
	filters: TaskFilters;
	users: User[];
	tags: { id: string; name: string; color?: string }[];
}>();

const FIELDS: TaskFilterField[] = ["state", "status", "assigneeId", "priority", "type", "deadline", "risk", "tagId"];
const SORTS: TasksSort[] = ["default", "risk", "deadline"];

const handleSearch = (value: string) => emit("update:search", value);
const handleView = (value: TasksView) => emit("update:view", value);
const handleSort = (value: TasksSort) => emit("update:sort", value);
</script>

<template>
	<base-flex class="project-tasks-toolbar" align="center" justify="space-between" :gap="3" wrap="wrap">
		<base-flex class="project-tasks-toolbar__left" align="center" :gap="3" wrap="wrap">
			<el-input
				class="project-tasks-toolbar__search"
				:model-value="search"
				:placeholder="translate('task.searchByName')"
				:prefix-icon="Search"
				clearable
				@update:model-value="(value: string) => handleSearch(value)"
			/>
			<task-filter-button :filters="filters" :fields="FIELDS" :users="users" :tags="tags" />
			<el-select
				class="project-tasks-toolbar__sort"
				:model-value="sort"
				:aria-label="translate('filters.sort')"
				@change="(value: TasksSort) => handleSort(value)"
			>
				<template #prefix>
					<span class="project-tasks-toolbar__sort-label">{{ translate("filters.sort") }}:</span>
				</template>
				<el-option v-for="item in SORTS" :key="item" :label="translate(`filters.sortBy.${item}`)" :value="item" />
			</el-select>
		</base-flex>
		<base-flex class="project-tasks-toolbar__views" align="center">
			<button
				class="project-tasks-toolbar__view"
				:class="{ 'project-tasks-toolbar__view--active': view === 'board' }"
				type="button"
				:aria-label="translate('task.viewBoard')"
				:title="translate('task.viewBoard')"
				@click="() => handleView('board')"
			>
				<el-icon :size="16"><board /></el-icon>
			</button>
			<button
				class="project-tasks-toolbar__view"
				:class="{ 'project-tasks-toolbar__view--active': view === 'list' }"
				type="button"
				:aria-label="translate('task.viewList')"
				:title="translate('task.viewList')"
				@click="() => handleView('list')"
			>
				<el-icon :size="16"><list /></el-icon>
			</button>
		</base-flex>
	</base-flex>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.project-tasks-toolbar {
	margin-bottom: map.get($spacers, 4);

	&__left {
		flex: 1;
		min-width: 0;
	}

	&__search {
		min-width: 180px;
		max-width: 300px;
		flex: 1;

		:deep(.el-input__wrapper) {
			height: 36px;
			border-radius: 99px;
		}
	}

	&__sort {
		width: 250px;
	}

	&__sort-label {
		color: var(--mt-color-gray-500);
		white-space: nowrap;
	}

	&__views {
		padding: 3px;
		border: 1px solid var(--mt-color-gray-200);
		border-radius: var(--mt-radius-sm);
		background: var(--mt-color-white);
	}

	&__view {
		width: 34px;
		height: 28px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--mt-color-gray-400);
		cursor: pointer;
		transition:
			background 0.18s var(--mt-ease),
			color 0.18s var(--mt-ease);

		&:hover {
			color: var(--mt-color-text);
		}

		&--active,
		&--active:hover {
			background: var(--mt-color-primary-light);
			color: var(--mt-color-primary);
		}
	}

	@media (max-width: 768px) {
		&__search {
			max-width: 100%;
		}
	}
}

@media (max-width: 640px) {
	/* Поиск — отдельной строкой, фильтры, сортировка и вид — строкой ниже */
	.project-tasks-toolbar__left {
		display: contents !important;
	}

	.project-tasks-toolbar__search {
		flex-basis: 100%;
		max-width: none;
	}

	.project-tasks-toolbar__sort-label {
		display: none;
	}

	.project-tasks-toolbar__sort {
		flex: 1;
		width: auto;
		min-width: 0;
	}
}
</style>
