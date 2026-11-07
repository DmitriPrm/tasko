<script lang="ts" setup>
import { ref, watch } from "vue";

import DeleteColumnDialog, {
	type DeleteColumnResult,
} from "@/pages/project/components/ProjectBoard/components/DeleteColumnDialog.vue";
import ProjectBoardColumn from "@/pages/project/components/ProjectBoard/components/ProjectBoardColumn.vue";
import ProjectBoardColumnForm from "@/pages/project/components/ProjectBoard/components/ProjectBoardColumnForm.vue";
import { baseApi } from "@/shared/api/baseApi";
import type { ProjectColumn, ProjectMember, Task } from "@/shared/api/v0/schemas";
import { openDialog } from "@/shared/lib/dialog/dialog";
import { openConfirm } from "@/shared/lib/dialog/openConfirm";
import { translate } from "@/shared/lib/theming/i18n/translate";
import { Plus } from "@/shared/ui/icon/icons";

const END = "__end__";
const NEW_COLUMN_COLOR = "#2563EB";

const emit = defineEmits<{
	moved: [payload: { taskId: string; columnId: string }];
	"quick-create": [payload: { columnId: string; title: string }];
	"columns-changed": [];
	open: [taskId: string];
	complete: [taskId: string];
	"change-assignee": [payload: { taskId: string; assigneeId: string | null }];
	"change-deadline": [payload: { taskId: string; deadlineAt: string | null }];
}>();

const props = defineProps<{
	projectId: string;
	tasks: Task[];
	columns: ProjectColumn[];
	members?: ProjectMember[];
	canManage?: boolean;
	canCreate?: boolean;
}>();

const isDragging = ref(false);
const lists = ref<Record<string, Task[]>>({});
const draftAfter = ref<string | null>(null);

let syncAfterDrag = false;

// Задача без колонки (старые данные) показывается в первой колонке с её статусом
const columnIdOf = (task: Task) => {
	if (task.columnId && props.columns.some((column) => column.id === task.columnId)) return task.columnId;
	return (props.columns.find((column) => column.status === task.status) ?? props.columns[0])?.id;
};

const groupTasks = (tasks: Task[]) => {
	const groups: Record<string, Task[]> = Object.fromEntries(props.columns.map((column) => [column.id, []]));
	for (const task of tasks) {
		const columnId = columnIdOf(task);
		if (columnId) groups[columnId].push(task);
	}
	return groups;
};

const isSameLayout = (groups: Record<string, Task[]>) =>
	props.columns.every((column) => {
		const next = groups[column.id] ?? [];
		const current = lists.value[column.id];
		return current && current.length === next.length && next.every((task) => current.some((item) => item.id === task.id));
	}) && Object.keys(lists.value).length === props.columns.length;

const applyTasks = (tasks: Task[]) => {
	const groups = groupTasks(tasks);
	if (!isSameLayout(groups)) {
		lists.value = groups;
		return;
	}
	// Состав колонок не изменился: обновляем данные карточек, сохраняя порядок
	const byId = new Map(tasks.map((task) => [task.id, task]));
	for (const column of props.columns) {
		lists.value[column.id] = lists.value[column.id].map((task) => byId.get(task.id) ?? task);
	}
};

watch(
	() => [props.tasks, props.columns] as const,
	([tasks]) => {
		if (isDragging.value) {
			syncAfterDrag = true;
			return;
		}
		applyTasks(tasks);
	},
	{ immediate: true },
);

const handleMove = () => true;

const handleChange = (columnId: string, event: { newIndex?: number }) => {
	const task = lists.value[columnId]?.[event.newIndex ?? 0];
	if (!task) return;
	emit("moved", { taskId: task.id, columnId });
};

const handleOpen = (taskId: string) => {
	if (isDragging.value) return;
	emit("open", taskId);
};

const handleDragStart = () => {
	isDragging.value = true;
	document.body.classList.add("is-dragging");
	window.getSelection()?.removeAllRanges();
};

const handleDragEnd = () => {
	document.body.classList.remove("is-dragging");
	window.setTimeout(() => {
		isDragging.value = false;
		if (!syncAfterDrag) return;
		syncAfterDrag = false;
		applyTasks(props.tasks);
	}, 0);
};

const handleCreateColumn = async (payload: { name: string; color: string }) => {
	const afterColumnId = draftAfter.value && draftAfter.value !== END ? draftAfter.value : undefined;
	draftAfter.value = null;
	await baseApi.projects.createProjectColumn({ id: props.projectId }, undefined, { ...payload, afterColumnId });
	emit("columns-changed");
};

const handleUpdateColumn = async (column: ProjectColumn, payload: { name: string; color: string }) => {
	await baseApi.projects.updateProjectColumn({ id: props.projectId, columnId: column.id }, undefined, payload);
	emit("columns-changed");
};

const handleDeleteColumn = async (column: ProjectColumn) => {
	if (props.columns.length <= 1) {
		await openConfirm({ title: translate("board.lastColumn"), text: column.name });
		return;
	}

	const params: Record<string, string> = {};
	const tasksCount = lists.value[column.id]?.length ?? 0;
	if (tasksCount > 0) {
		const result = await openDialog<DeleteColumnResult>(DeleteColumnDialog, {
			column,
			otherColumns: props.columns.filter((item) => item.id !== column.id),
		});
		if (!result) return;
		params.tasks = result.action;
		if (result.targetColumnId) params.targetColumnId = result.targetColumnId;
	} else {
		const confirmed = await openConfirm({ title: translate("board.deleteColumnEmpty"), text: column.name });
		if (!confirmed) return;
	}

	await baseApi.projects.deleteProjectColumn({ id: props.projectId, columnId: column.id }, params);
	emit("columns-changed");
};
</script>

<template>
	<section class="project-board">
		<base-flex class="project-board__columns" align="flex-start" :gap="5">
			<template v-for="column in columns" :key="column.id">
				<project-board-column
					v-model:tasks="lists[column.id]"
					:column="column"
					:members="members"
					:can-manage="canManage"
					:can-create="canCreate"
					:on-move="handleMove"
					@quick-create="(title) => emit('quick-create', { columnId: column.id, title })"
					@add-column="draftAfter = column.id"
					@update-column="(payload) => handleUpdateColumn(column, payload)"
					@delete-column="handleDeleteColumn(column)"
					@changed="(event) => handleChange(column.id, event)"
					@open="handleOpen"
					@complete="(taskId) => emit('complete', taskId)"
					@change-assignee="(payload) => emit('change-assignee', payload)"
					@change-deadline="(payload) => emit('change-deadline', payload)"
					@drag-start="handleDragStart"
					@drag-end="handleDragEnd"
				/>
				<section v-if="draftAfter === column.id" class="project-board__draft">
					<project-board-column-form
						name=""
						:color="NEW_COLUMN_COLOR"
						:placeholder="translate('board.columnName')"
						:hint="translate('board.enterToCreateColumn')"
						:submit-label="translate('common.create')"
						@submit="handleCreateColumn"
						@cancel="draftAfter = null"
					/>
				</section>
			</template>

			<template v-if="canManage">
				<section v-if="draftAfter === END" class="project-board__draft">
					<project-board-column-form
						name=""
						:color="NEW_COLUMN_COLOR"
						:placeholder="translate('board.columnName')"
						:hint="translate('board.enterToCreateColumn')"
						:submit-label="translate('common.create')"
						@submit="handleCreateColumn"
						@cancel="draftAfter = null"
					/>
				</section>
				<button v-else class="project-board__add-column" type="button" @click="draftAfter = END">
					<el-icon :size="16"><plus /></el-icon>
					{{ translate("board.addColumnShort") }}
				</button>
			</template>
		</base-flex>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.project-board {
	display: flex;
	flex: 1 0 auto;
	flex-direction: column;
	min-width: 0;
	padding-bottom: map.get($spacers, 6);
	overflow-x: auto;

	&__columns {
		flex: 1 0 auto;
		min-width: min-content;
	}

	&__draft {
		flex-shrink: 0;
		width: 264px;
	}

	&__add-column {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: map.get($spacers, 2);
		width: 200px;
		padding: map.get($spacers, 3) map.get($spacers, 4);
		border: 1px dashed var(--mt-color-gray-300);
		border-radius: var(--mt-radius);
		background: transparent;
		color: var(--mt-color-gray-500);
		font: inherit;
		font-size: map.get($font-sizes, 6);
		cursor: pointer;
		transition:
			background 0.18s var(--mt-ease),
			border-color 0.18s var(--mt-ease);

		&:hover {
			border-color: var(--mt-color-primary);
			background: var(--mt-color-white);
		}
	}
}
</style>
