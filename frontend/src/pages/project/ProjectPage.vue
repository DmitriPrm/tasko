<script lang="ts" setup>
import { Edit, Star, StarFilled } from "@/shared/ui/icon/icons";
import { computed, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";

import ProjectAnalytics from "@/pages/project/components/ProjectAnalytics.vue";
import ProjectBoard from "@/pages/project/components/ProjectBoard.vue";
import ProjectMembers from "@/pages/project/components/ProjectMembers.vue";
import ProjectTasksToolbar, {
	type CompletedFilter,
	type TasksView,
} from "@/pages/project/components/ProjectTasksToolbar.vue";
import ProjectEditDialog from "@/pages/projects/components/ProjectEditDialog.vue";
import TaskCreateDialog from "@/pages/project/components/TaskCreateDialog.vue";
import { baseApi } from "@/shared/api/baseApi";
import { openDialog } from "@/shared/lib/dialog/dialog";
import { openConfirm } from "@/shared/lib/dialog/openConfirm";
import type { ProjectColumn, ProjectMember, Task, TaskPriority, TaskStatus, User } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { useOnTaskChange } from "@/shared/lib/composable/useOnTaskChange";
import { isTaskOverdue } from "@/shared/lib/helpers/formatDate";
import { priorityLabel, projectStatusDot, projectStatusLabel, statusLabel, statusTagType } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BasePage from "@/shared/ui/page/BasePage.vue";
import BaseTable from "@/shared/ui/table/BaseTable.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";
import { useAuthStore } from "@/store/auth";
import { useFavoritesStore } from "@/store/favorites";
import { useTaskDrawerStore } from "@/store/taskDrawer";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const taskDrawer = useTaskDrawerStore();
const activeTab = ref("tasks");
const tasksView = ref<TasksView>("board");
const search = ref("");
const filterAssigneeId = ref("");
const filterTagId = ref("");
const filterCompleted = ref<CompletedFilter>("all");
const filterOverdue = ref(false);
const filterStatus = ref<TaskStatus | "">("");
const filterPriority = ref<TaskPriority | "">("");
const lastProjectId = ref(String(route.params.id ?? ""));
const projectId = computed(() => lastProjectId.value);

// При уходе со страницы route.params.id пропадает: не запрашиваем /projects/undefined
watch(
	() => route.params.id,
	(id) => {
		if (typeof id === "string" && id) lastProjectId.value = id;
	},
);

onBeforeRouteLeave(() => {
	activeTab.value = "tasks";
});

const { state: project, fetch: fetchProject } = useFetch(baseApi.projects.getProject, "data", {
	immediate: true,
	pathParams: computed(() => ({ id: projectId.value })),
});

const { state: tasksState, fetch: fetchTasks } = useFetch(baseApi.tasks.getProjectTasks, "data.items", {
	immediate: true,
	pathParams: computed(() => ({ id: projectId.value })),
	params: { perPage: 100 },
});

const { state: tagsState, fetch: fetchTags } = useFetch(baseApi.projects.getProjectTags, "data", {
	immediate: true,
	pathParams: computed(() => ({ id: projectId.value })),
});

const { state: columnsState, fetch: fetchColumns } = useFetch(baseApi.projects.getProjectColumns, "data", {
	immediate: true,
	pathParams: computed(() => ({ id: projectId.value })),
});

const columns = computed(() => (columnsState.value ?? []) as ProjectColumn[]);
const tasks = computed(() => (tasksState.value ?? []) as Task[]);
const members = computed(() => project.value?.members ?? []);
const memberUsers = computed(() => members.value.map((member: ProjectMember) => member.user));
const projectTags = computed(() => tagsState.value || project.value?.tags || []);

const visibleTasks = computed(() => {
	return tasks.value.filter((task) => {
		const query = search.value.trim().toLowerCase();
		if (query && !task.title.toLowerCase().includes(query)) return false;
		if (filterAssigneeId.value && task.assigneeId !== filterAssigneeId.value) return false;
		if (filterTagId.value && !(task.tags || []).some((tag) => tag.id === filterTagId.value)) return false;
		if (filterCompleted.value === "yes" && !task.isCompleted) return false;
		if (filterCompleted.value === "no" && task.isCompleted) return false;
		if (filterOverdue.value && !isTaskOverdue(task)) return false;
		if (filterStatus.value && task.status !== filterStatus.value) return false;
		if (filterPriority.value && task.priority !== filterPriority.value) return false;
		return true;
	});
});

const canManage = computed(() => {
	if (authStore.isAdmin) return true;
	return members.value.some(
		(member: { userId: string; projectRole: string }) =>
			member.userId === authStore.user?.id && member.projectRole === "MANAGER",
	);
});

const handleOpenCreate = async () => {
	const created = await openDialog(TaskCreateDialog, { projectId: projectId.value });
	if (created) await handleReload();
};
const handleReload = async () => {
	await Promise.all([fetchProject(), fetchTasks(), fetchColumns(), fetchTags(), favoritesStore.load()]);
};

const snapshotTasks = () => ((tasksState.value ?? []) as Task[]).map((task) => ({ ...task }));

const commitTask = async (taskId: string, next: Task, request: () => Promise<unknown>) => {
	const previous = snapshotTasks();
	tasksState.value = previous.map((task) => (task.id === taskId ? next : task));
	try {
		await request();
	} catch {
		tasksState.value = previous;
		return;
	}
	await fetchTasks().catch(() => false);
};

const handleMoved = ({ taskId, columnId }: { taskId: string; columnId: string }) => {
	const current = tasks.value.find((task) => task.id === taskId);
	const column = columns.value.find((item) => item.id === columnId);
	if (!current || !column) return;
	return commitTask(taskId, { ...current, status: column.status, columnId }, async () => {
		await baseApi.tasks.transitionTask({ id: taskId }, undefined, { columnId });
		await fetchColumns().catch(() => false);
	});
};

// Быстрое создание задачи прямо в колонке (Enter в поле «Добавить задачу»)
const handleQuickCreate = async ({ columnId, title }: { columnId: string; title: string }) => {
	try {
		await baseApi.tasks.createTask({ id: projectId.value }, undefined, { title, columnId });
	} catch {
		return;
	}
	await Promise.all([fetchTasks(), fetchColumns()]).catch(() => false);
};

const handleColumnsChanged = async () => {
	await Promise.all([fetchColumns(), fetchTasks()]).catch(() => false);
};

const handleOpenTask = (taskId: string) => {
	taskDrawer.open(taskId);
};

const handleTaskClick = (row: Task) => handleOpenTask(row.id);

const handleComplete = (taskId: string) => {
	const task = tasks.value.find((item) => item.id === taskId);
	if (!task) return;
	const isCompleted = !task.isCompleted;
	return commitTask(taskId, { ...task, isCompleted }, () =>
		baseApi.tasks.updateTask({ id: taskId }, undefined, { isCompleted }),
	);
};

const handleChangeAssignee = ({ taskId, assigneeId }: { taskId: string; assigneeId: string | null }) => {
	const task = tasks.value.find((item) => item.id === taskId);
	if (!task) return;
	const assignee = memberUsers.value.find((user: User) => user.id === assigneeId) ?? null;
	return commitTask(taskId, { ...task, assigneeId, assignee }, () =>
		baseApi.tasks.updateTask({ id: taskId }, undefined, { assigneeId }),
	);
};

const handleChangeDeadline = ({ taskId, deadlineAt }: { taskId: string; deadlineAt: string | null }) => {
	const task = tasks.value.find((item) => item.id === taskId);
	if (!task) return;
	return commitTask(taskId, { ...task, deadlineAt }, () =>
		baseApi.tasks.updateTask({ id: taskId }, undefined, { deadlineAt }),
	);
};

const taskColumns = computed(() => [
	{ key: "title", label: translate("task.name") },
	{ key: "status", label: translate("task.status") },
	{ key: "priority", label: translate("task.priority") },
	{ key: "assignee", label: translate("task.assignee") },
]);

const handleEditProject = async () => {
	const result = await openDialog<"saved" | "deleted">(ProjectEditDialog, { projectId: projectId.value });
	if (result === "deleted") {
		await favoritesStore.load();
		await router.push({ name: "projects" });
		return;
	}
	if (result) await handleReload();
};

const handleDeleteProject = async () => {
	const confirmed = await openConfirm({
		title: translate("project.deleteTitle"),
		text: translate("project.deleteText"),
	});
	if (!confirmed) return;
	await baseApi.projects.deleteProject({ id: projectId.value });
	await favoritesStore.load();
	await router.push({ name: "projects" });
};

const handleFavorite = async () => {
	if (!project.value) return;
	await favoritesStore.toggle(project.value);
	await fetchProject();
};

useOnTaskChange({ reload: () => handleReload() });
</script>

<template>
	<base-page
		class="project-page"
		:class="{ 'project-page--board': activeTab === 'tasks' && tasksView === 'board' }"
		:title="project?.name || translate('project.title')"
	>
		<template #heading>
			<base-flex align="center" :gap="2">
				<h1 class="project-page__title">{{ project?.name || translate("project.title") }}</h1>
				<button
					class="project-page__star"
					:class="{ 'project-page__star--active': project?.isFavorite }"
					type="button"
					:title="project?.isFavorite ? translate('project.unfavorite') : translate('project.favorite')"
					@click="handleFavorite"
				>
					<el-icon :size="20">
						<star-filled v-if="project?.isFavorite" />
						<star v-else />
					</el-icon>
				</button>
			</base-flex>
		</template>
		<template #subtitle>
			<base-flex v-if="project" class="project-page__status" align="center" :gap="2">
				<span class="project-page__status-dot" :style="{ background: projectStatusDot[project.status] }" />
				<span>{{ projectStatusLabel(project.status) }}</span>
			</base-flex>
		</template>
		<template v-if="canManage || authStore.hasPermission('TASKS_CREATE')" #actions>
			<base-flex :gap="3">
				<base-button v-if="canManage" @click="handleEditProject">
					<el-icon :size="16"><edit /></el-icon>
					{{ translate("project.edit") }}
				</base-button>
				<base-button v-if="canManage" type="danger" plain @click="handleDeleteProject">
					{{ translate("project.delete") }}
				</base-button>
				<base-button v-if="authStore.hasPermission('TASKS_CREATE')" type="primary" @click="handleOpenCreate">
					{{ translate("task.create") }}
				</base-button>
			</base-flex>
		</template>
		<el-tabs v-model="activeTab" class="project-page__tabs">
			<el-tab-pane :label="translate('project.tasks')" name="tasks">
				<project-tasks-toolbar
					:search="search"
					:view="tasksView"
					:assignee-id="filterAssigneeId"
					:tag-id="filterTagId"
					:completed="filterCompleted"
					:overdue="filterOverdue"
					:status="filterStatus"
					:priority="filterPriority"
					:users="memberUsers"
					:tags="projectTags"
					@update:search="(value) => (search = value)"
					@update:view="(value) => (tasksView = value)"
					@update:assignee-id="(value) => (filterAssigneeId = value)"
					@update:tag-id="(value) => (filterTagId = value)"
					@update:completed="(value) => (filterCompleted = value)"
					@update:overdue="(value) => (filterOverdue = value)"
					@update:status="(value) => (filterStatus = value)"
					@update:priority="(value) => (filterPriority = value)"
				/>
				<project-board
					v-if="tasksView === 'board'"
					:project-id="projectId"
					:tasks="visibleTasks"
					:columns="columns"
					:members="members"
					:can-manage="canManage"
					:can-create="authStore.hasPermission('TASKS_CREATE')"
					@moved="handleMoved"
					@quick-create="handleQuickCreate"
					@columns-changed="handleColumnsChanged"
					@open="handleOpenTask"
					@complete="handleComplete"
					@change-assignee="handleChangeAssignee"
					@change-deadline="handleChangeDeadline"
				/>
				<base-table v-else code="project-tasks" :rows="visibleTasks" :columns="taskColumns" @row-click="handleTaskClick">
					<template #status="{ row }">
						<el-tag :type="statusTagType[row.status]" size="small">{{ statusLabel(row.status) }}</el-tag>
					</template>
					<template #priority="{ row }">{{ priorityLabel(row.priority) }}</template>
					<template #assignee="{ row }">
						<base-user-name :user="row.assignee" />
					</template>
				</base-table>
			</el-tab-pane>
			<el-tab-pane :label="translate('project.members')" name="members">
				<project-members
					:project-id="projectId"
					:members="members"
					:can-manage="canManage"
					@changed="handleReload"
				/>
			</el-tab-pane>
			<el-tab-pane
				v-if="authStore.hasPermission('ANALYTICS_VIEW')"
				:label="translate('project.analytics')"
				name="analytics"
			>
				<project-analytics :project-id="projectId" />
			</el-tab-pane>
		</el-tabs>
	</base-page>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.project-page {
	display: flex;
	flex: 1 0 auto;
	flex-direction: column;
	min-width: 0;

	&__title {
		margin: 0;
		font-size: map.get($font-sizes, 2);
	}

	&__star {
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--mt-color-gray-300);
		cursor: pointer;

		&--active {
			color: var(--mt-color-warning);
		}
	}

	&__status {
		margin-top: map.get($spacers, 2);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
	}

	&__status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	&__tabs {
		display: flex;
		flex: 1 0 auto;
		flex-direction: column;
		min-width: 0;

		:deep(.el-tabs__header) {
			flex-shrink: 0;
			margin-bottom: map.get($spacers, 6);
		}

		:deep(.el-tabs__content) {
			display: flex;
			flex: 1 0 auto;
			flex-direction: column;
			overflow: visible;
		}

		:deep(.el-tab-pane) {
			display: flex;
			flex: 1 0 auto;
			flex-direction: column;
			min-width: 0;
		}
	}

	@media (max-width: 768px) {
		&__title {
			font-size: map.get($font-sizes, 3);
		}
	}
}
</style>
