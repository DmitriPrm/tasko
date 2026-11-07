<script lang="ts" setup>
import { Board, Filter as FilterIcon, List, Search } from "@/shared/ui/icon/icons";

import type { Tag, TaskPriority, TaskStatus, User } from "@/shared/api/v0/schemas";
import { priorityLabel, statusLabel } from "@/shared/lib/helpers/labels";
import { BOARD_COLUMNS } from "@/shared/lib/helpers/taskTransitions";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseUserSelect from "@/shared/ui/select/BaseUserSelect.vue";

export type TasksView = "board" | "list";
export type CompletedFilter = "all" | "yes" | "no";

const emit = defineEmits<{
	"update:search": [value: string];
	"update:view": [value: TasksView];
	"update:assigneeId": [value: string];
	"update:tagId": [value: string];
	"update:completed": [value: CompletedFilter];
	"update:overdue": [value: boolean];
	"update:status": [value: TaskStatus | ""];
	"update:priority": [value: TaskPriority | ""];
}>();

defineProps<{
	search: string;
	view: TasksView;
	assigneeId: string;
	tagId: string;
	completed: CompletedFilter;
	overdue?: boolean;
	status?: TaskStatus | "";
	priority?: TaskPriority | "";
	users: User[];
	tags: Tag[];
}>();

const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const handleSearch = (value: string) => emit("update:search", value);
const handleView = (value: TasksView) => emit("update:view", value);
const handleAssignee = (value: string | string[]) =>
	emit("update:assigneeId", Array.isArray(value) ? value[0] || "" : value);
const handleTag = (value: string) => emit("update:tagId", value);
const handleCompleted = (value: CompletedFilter) => emit("update:completed", value);
const handleOverdue = (value: boolean) => emit("update:overdue", value);
const handleStatus = (value: TaskStatus | "") => emit("update:status", value || "");
const handlePriority = (value: TaskPriority | "") => emit("update:priority", value || "");
</script>

<template>
	<base-flex class="project-tasks-toolbar" align="center" justify="space-between" :gap="4" wrap="wrap">
		<el-input
			class="project-tasks-toolbar__search"
			:model-value="search"
			:placeholder="translate('task.searchByName')"
			:prefix-icon="Search"
			clearable
			@update:model-value="(value: string) => handleSearch(value)"
		/>
		<base-flex align="center" :gap="3">
			<el-popover trigger="click" :width="280">
				<div id="project-tasks-toolbar-filters">
					<base-flex class="project-tasks-toolbar__filters" direction="column" :gap="3">
						<strong>{{ translate("common.filters") }}</strong>
						<base-user-select
							:model-value="assigneeId"
							:users="users"
							clearable
							:teleported="false"
							:placeholder="translate('task.assignee')"
							@update:model-value="handleAssignee"
						/>
						<el-select
							:model-value="tagId"
							clearable
							:teleported="false"
							:placeholder="translate('task.tags')"
							@change="(value: string) => handleTag(value || '')"
						>
							<el-option v-for="tag in tags" :key="tag.id" :label="tag.name" :value="tag.id" />
						</el-select>
						<el-select
							:model-value="completed"
							:teleported="false"
							@change="(value: CompletedFilter) => handleCompleted(value)"
						>
							<el-option :label="translate('common.all')" value="all" />
							<el-option :label="translate('task.completed')" value="yes" />
							<el-option :label="translate('task.notCompleted')" value="no" />
						</el-select>
						<el-select
							:model-value="status"
							clearable
							:teleported="false"
							:placeholder="translate('task.status')"
							@change="(value: TaskStatus) => handleStatus(value || '')"
						>
							<el-option v-for="item in BOARD_COLUMNS" :key="item" :label="statusLabel(item)" :value="item" />
						</el-select>
						<el-select
							:model-value="priority"
							clearable
							:teleported="false"
							:placeholder="translate('task.priority')"
							@change="(value: TaskPriority) => handlePriority(value || '')"
						>
							<el-option v-for="item in priorities" :key="item" :label="priorityLabel(item)" :value="item" />
						</el-select>
						<el-checkbox :model-value="overdue" @update:model-value="(value: boolean) => handleOverdue(Boolean(value))">
							{{ translate("task.overdue") }}
						</el-checkbox>
					</base-flex>
				</div>
				<template #reference>
					<base-button>
						<base-flex align="center" :gap="1">
							<el-icon :size="16" aria-hidden="true">
								<filter-icon />
							</el-icon>
							<span>{{ translate("common.filters") }}</span>
						</base-flex>
					</base-button>
				</template>
			</el-popover>
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
	</base-flex>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.project-tasks-toolbar {
	margin-bottom: map.get($spacers, 5);

	&__search {
		min-width: 180px;
		max-width: 300px;
		flex: 1;

		:deep(.el-input__wrapper) {
			height: 36px;
			border-radius: 99px;
		}
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
</style>
