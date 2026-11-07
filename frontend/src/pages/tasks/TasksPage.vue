<script lang="ts" setup>
import { computed, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { Task } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { useOnTaskChange } from "@/shared/lib/composable/useOnTaskChange";
import { formatDate } from "@/shared/lib/helpers/formatDate";
import { PRIORITY_RANK, priorityLabel, STATUS_RANK, statusLabel, statusTagType } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BasePage from "@/shared/ui/page/BasePage.vue";
import BaseTable from "@/shared/ui/table/BaseTable.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";
import { useAuthStore } from "@/store/auth";
import { useTaskDrawerStore } from "@/store/taskDrawer";

const authStore = useAuthStore();
const taskDrawer = useTaskDrawerStore();
const status = ref<string>("");
const onlyMine = ref(true);

const params = computed(() => ({
	status: status.value || undefined,
	assigneeId: onlyMine.value ? authStore.user?.id : undefined,
	perPage: 100,
}));

const { state, isLoading, fetch } = useFetch(baseApi.tasks.getTasks, "data.items", {
	immediate: true,
	params,
});

const columns = computed(() => [
	{ key: "title", label: translate("task.name") },
	{ key: "project", label: translate("project.title") },
	{ key: "status", label: translate("task.status"), sortValue: (row: Task) => STATUS_RANK[row.status] },
	{ key: "priority", label: translate("task.priority"), sortValue: (row: Task) => PRIORITY_RANK[row.priority] },
	{ key: "deadlineAt", label: translate("task.deadline") },
	{ key: "assignee", label: translate("task.assignee") },
]);

const handleRowClick = (row: Task) => {
	taskDrawer.open(row.id);
};

useOnTaskChange({ reload: () => fetch() });
</script>

<template>
	<base-page :title="translate('task.title')">
		<template #actions>
			<base-flex class="tasks-page__actions" align="center" :gap="3" wrap="wrap" width="full">
				<el-switch v-model="onlyMine" :active-text="translate('task.my')" />
				<el-select v-model="status" class="tasks-page__status" clearable :placeholder="translate('task.status')">
					<el-option :label="translate('taskStatus.TODO')" value="TODO" />
					<el-option :label="translate('taskStatus.IN_PROGRESS')" value="IN_PROGRESS" />
					<el-option :label="translate('taskStatus.REVIEW')" value="REVIEW" />
					<el-option :label="translate('taskStatus.DONE')" value="DONE" />
					<el-option :label="translate('taskStatus.CANCELLED')" value="CANCELLED" />
				</el-select>
			</base-flex>
		</template>
		<base-table code="tasks" :rows="state || []" :columns="columns" :loading="isLoading" @row-click="handleRowClick">
			<template #project="{ row }">{{ row.project?.name }}</template>
			<template #status="{ row }">
				<el-tag :type="statusTagType[row.status]" size="small">{{ statusLabel(row.status) }}</el-tag>
			</template>
			<template #priority="{ row }">{{ priorityLabel(row.priority) }}</template>
			<template #deadlineAt="{ row }">{{ formatDate(row.deadlineAt) || "—" }}</template>
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
	&__status {
		min-width: 200px;
		flex: 1;
	}
}
</style>
