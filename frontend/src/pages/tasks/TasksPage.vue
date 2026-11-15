<script lang="ts" setup>
import { Search } from "@/shared/ui/icon/icons";
import { computed, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { Task, User } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { useOnTaskChange } from "@/shared/lib/composable/useOnTaskChange";
import { type TaskFilterField, useTaskFilters } from "@/shared/lib/composable/useTaskFilters";
import { riskSortValue } from "@/shared/lib/helpers/forecast";
import { formatDate, isTaskOverdue } from "@/shared/lib/helpers/formatDate";
import { PRIORITY_RANK, priorityLabel, STATUS_RANK, statusLabel, statusTagType } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import TaskRiskTag from "@/shared/ui/forecast/TaskRiskTag.vue";
import BasePage from "@/shared/ui/page/BasePage.vue";
import BaseTable from "@/shared/ui/table/BaseTable.vue";
import TaskFilterButton from "@/shared/ui/task-filters/TaskFilterButton.vue";
import TaskFilterChips from "@/shared/ui/task-filters/TaskFilterChips.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";
import { useAuthStore } from "@/store/auth";
import { useTaskDrawerStore } from "@/store/taskDrawer";

const authStore = useAuthStore();
const taskDrawer = useTaskDrawerStore();
const onlyMine = ref(true);
const search = ref("");

const params = computed(() => ({
	assigneeId: onlyMine.value ? authStore.user?.id : undefined,
	perPage: 100,
}));

const { state, isLoading, fetch } = useFetch(baseApi.tasks.getTasks, "data.items", {
	immediate: true,
	params,
});

const tasks = computed(() => (state.value || []) as Task[]);

/** Проекты и исполнители для фильтров — из загруженных задач */
const projects = computed(() => {
	const map = new Map<string, { id: string; name: string }>();
	for (const task of tasks.value) if (task.project) map.set(task.project.id, task.project);
	return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
});
const users = computed(() => {
	const map = new Map<string, User>();
	for (const task of tasks.value) if (task.assignee) map.set(task.assignee.id, task.assignee);
	return [...map.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
});

// По умолчанию — только открытые: закрытые и отменённые не мешают работать (как в Jira и Asana)
const filters = useTaskFilters({ state: "open" }, () => ({ users: users.value, projects: projects.value }));

const fields = computed<TaskFilterField[]>(() => [
	"state",
	"status",
	"projectId",
	...(onlyMine.value ? [] : (["assigneeId"] as TaskFilterField[])),
	"priority",
	"type",
	"deadline",
	"risk",
]);

const rows = computed(() => {
	const query = search.value.trim().toLowerCase();
	return tasks.value.filter((task) => (!query || task.title.toLowerCase().includes(query)) && filters.matches(task));
});

const handleOnlyMine = (value: boolean) => {
	onlyMine.value = value;
	// Фильтр по исполнителю теряет смысл, когда показаны только мои задачи
	if (value) filters.clear("assigneeId");
};

const columns = computed(() => [
	{ key: "title", label: translate("task.name") },
	{ key: "project", label: translate("project.title") },
	{ key: "status", label: translate("task.status"), sortValue: (row: Task) => STATUS_RANK[row.status] },
	{ key: "priority", label: translate("task.priority"), sortValue: (row: Task) => PRIORITY_RANK[row.priority] },
	{ key: "deadlineAt", label: translate("task.deadline"), sortValue: (row: Task) => row.deadlineAt ?? "" },
	{ key: "risk", label: translate("forecast.risk"), sortValue: (row: Task) => riskSortValue(row) },
	{ key: "createdAt", label: translate("task.createdAt"), sortValue: (row: Task) => row.createdAt },
	{ key: "assignee", label: translate("task.assignee") },
]);

const handleRowClick = (row: Task) => {
	taskDrawer.open(row.id);
};

useOnTaskChange({ reload: () => fetch() });
</script>

<template>
	<base-page :title="translate('task.title')">
		<base-flex class="tasks-page__toolbar" align="center" justify="space-between" :gap="3" wrap="wrap">
			<base-flex class="tasks-page__left" align="center" :gap="3" wrap="wrap">
				<el-input
					v-model="search"
					class="tasks-page__search"
					:placeholder="translate('task.searchByName')"
					:prefix-icon="Search"
					clearable
				/>
				<el-switch
					:model-value="onlyMine"
					:active-text="translate('task.my')"
					@update:model-value="(value: string | number | boolean) => handleOnlyMine(Boolean(value))"
				/>
			</base-flex>
			<task-filter-button
				:filters="filters"
				:fields="fields"
				:users="users"
				:projects="projects"
				placement="bottom-end"
			/>
		</base-flex>
		<task-filter-chips :filters="filters" :shown="rows.length" />
		<base-table code="tasks" :rows="rows" :columns="columns" :loading="isLoading" @row-click="handleRowClick">
			<template #project="{ row }">{{ row.project?.name }}</template>
			<template #status="{ row }">
				<el-tag :type="statusTagType[row.status]" size="small">{{ statusLabel(row.status) }}</el-tag>
			</template>
			<template #priority="{ row }">{{ priorityLabel(row.priority) }}</template>
			<template #deadlineAt="{ row }">
				<span :class="{ 'tasks-page__overdue': isTaskOverdue(row) }">{{ formatDate(row.deadlineAt) || "—" }}</span>
			</template>
			<template #risk="{ row }"><task-risk-tag :task="row" /></template>
			<template #createdAt="{ row }">{{ formatDate(row.createdAt) }}</template>
			<template #assignee="{ row }">
				<base-user-name :user="row.assignee" />
			</template>
		</base-table>
	</base-page>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.tasks-page {
	&__toolbar {
		margin-bottom: map.get($spacers, 4);
	}

	&__left {
		flex: 1;
		min-width: 0;
	}

	&__search {
		max-width: 300px;
		flex: 1;
		min-width: 180px;

		:deep(.el-input__wrapper) {
			height: 36px;
			border-radius: 99px;
		}
	}

	&__overdue {
		color: var(--mt-color-danger);
		font-weight: 600;
	}
}
</style>
