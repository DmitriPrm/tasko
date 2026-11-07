<script lang="ts" setup>
import { computed, ref } from "vue";
import { VueDraggable } from "vue-draggable-plus";

import ProjectBoardCard from "@/pages/project/components/ProjectBoard/components/ProjectBoardCard.vue";
import ProjectBoardColumnForm from "@/pages/project/components/ProjectBoard/components/ProjectBoardColumnForm.vue";
import type { ProjectColumn, ProjectMember, Task } from "@/shared/api/v0/schemas";
import { translate } from "@/shared/lib/theming/i18n/translate";
import { MoreFilled } from "@/shared/ui/icon/icons";

const emit = defineEmits<{
	"update:tasks": [tasks: Task[]];
	"quick-create": [title: string];
	"add-column": [];
	"update-column": [payload: { name: string; color: string }];
	"delete-column": [];
	changed: [event: { newIndex?: number }];
	open: [taskId: string];
	complete: [taskId: string];
	"change-assignee": [payload: { taskId: string; assigneeId: string | null }];
	"change-deadline": [payload: { taskId: string; deadlineAt: string | null }];
	"drag-start": [];
	"drag-end": [];
}>();

const props = defineProps<{
	column: ProjectColumn;
	tasks: Task[];
	members?: ProjectMember[];
	canManage?: boolean;
	canCreate?: boolean;
	onMove: (event: { from: HTMLElement; to: HTMLElement }) => boolean;
}>();

const tasksModel = computed({
	get: () => props.tasks,
	set: (value) => emit("update:tasks", value),
});

const isEditing = ref(false);
const quickTitle = ref("");
const isQuickFocused = ref(false);

const handleQuickKeydown = (event: KeyboardEvent) => {
	if (event.isComposing) return;
	if (event.key === "Enter") {
		event.preventDefault();
		const title = quickTitle.value.trim();
		if (!title) return;
		emit("quick-create", title);
		quickTitle.value = "";
	} else if (event.key === "Escape") {
		quickTitle.value = "";
		(event.target as HTMLInputElement).blur();
	}
};

const handleMenu = (command: string) => {
	if (command === "add") emit("add-column");
	if (command === "edit") isEditing.value = true;
	if (command === "delete") emit("delete-column");
};

const handleSubmitEdit = (payload: { name: string; color: string }) => {
	isEditing.value = false;
	if (payload.name === props.column.name && payload.color === props.column.color) return;
	emit("update-column", payload);
};

const handleOpen = (taskId: string) => emit("open", taskId);
const handleComplete = (taskId: string) => emit("complete", taskId);
const handleChangeAssignee = (payload: { taskId: string; assigneeId: string | null }) =>
	emit("change-assignee", payload);
const handleChangeDeadline = (payload: { taskId: string; deadlineAt: string | null }) =>
	emit("change-deadline", payload);
const handleChanged = (event: { newIndex?: number }) => emit("changed", event);
const handleDragStart = () => emit("drag-start");
const handleDragEnd = () => emit("drag-end");
</script>

<template>
	<section class="project-board-column" :style="{ '--column-accent': column.color }">
		<project-board-column-form
			v-if="isEditing"
			class="project-board-column__edit"
			:name="column.name"
			:color="column.color"
			:placeholder="translate('board.columnName')"
			:hint="translate('board.enterToApply')"
			:submit-label="translate('common.save')"
			@submit="handleSubmitEdit"
			@cancel="isEditing = false"
		/>
		<base-flex
			class="project-board-column__head"
			:class="{ 'project-board-column__head--hidden': isEditing }"
			align="center"
			justify="space-between"
		>
			<h4 class="project-board-column__title" :title="column.name">
				<span class="project-board-column__name">{{ column.name }}</span>
				<span class="project-board-column__count">{{ tasks.length }}</span>
			</h4>
			<el-dropdown v-if="canManage" trigger="click" placement="bottom-end" @command="handleMenu">
				<button class="project-board-column__more" type="button" :aria-label="translate('board.columnMenu')">
					<el-icon :size="16"><more-filled /></el-icon>
				</button>
				<template #dropdown>
					<el-dropdown-menu>
						<el-dropdown-item command="add">{{ translate("board.addColumn") }}</el-dropdown-item>
						<el-dropdown-item command="edit">{{ translate("board.editColumn") }}</el-dropdown-item>
						<el-dropdown-item command="delete" class="project-board-column__danger">
							{{ translate("board.deleteColumn") }}
						</el-dropdown-item>
					</el-dropdown-menu>
				</template>
			</el-dropdown>
		</base-flex>

		<div v-if="canCreate" class="project-board-column__quick">
			<input
				v-model="quickTitle"
				class="project-board-column__add"
				type="text"
				maxlength="255"
				:placeholder="translate('task.add')"
				@focus="isQuickFocused = true"
				@blur="isQuickFocused = false"
				@keydown="handleQuickKeydown"
			/>
			<p v-if="isQuickFocused" class="project-board-column__hint">{{ translate("board.enterToCreateTask") }}</p>
		</div>

		<vue-draggable
			v-model="tasksModel"
			class="project-board-column__list"
			group="project-tasks"
			direction="vertical"
			ghost-class="project-board-column__ghost"
			fallback-class="project-board-card-fallback"
			:data-column-id="column.id"
			:animation="150"
			:empty-insert-threshold="48"
			:on-move="onMove"
			@add="(event) => handleChanged(event)"
			@start="handleDragStart"
			@end="handleDragEnd"
		>
			<project-board-card
				v-for="task in tasksModel"
				:key="task.id"
				:task="task"
				:members="members"
				@open="handleOpen"
				@complete="handleComplete"
				@change-assignee="handleChangeAssignee"
				@change-deadline="handleChangeDeadline"
			/>
		</vue-draggable>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.project-board-column {
	position: relative;
	display: flex;
	flex: 1;
	flex-direction: column;
	align-self: stretch;
	min-width: 264px;
	padding: map.get($spacers, 2);
	border-radius: var(--mt-radius);
	background: var(--mt-color-gray-100);

	&__head {
		position: relative;
		flex-shrink: 0;
		min-height: 40px;
		margin-bottom: map.get($spacers, 2);
		padding: map.get($spacers, 1) map.get($spacers, 3) map.get($spacers, 3);
		border-radius: var(--mt-radius);
		background: var(--mt-color-white);

		&--hidden {
			visibility: hidden;
		}

		&::after {
			content: "";
			position: absolute;
			right: map.get($spacers, 3);
			bottom: 7px;
			left: map.get($spacers, 3);
			height: 2px;
			border-radius: 2px;
			background: var(--column-accent, var(--mt-color-gray-400));
		}
	}

	&__title {
		display: flex;
		flex: 1;
		align-items: center;
		gap: map.get($spacers, 2);
		min-width: 0;
		margin: 0;
		font-size: map.get($font-sizes, 6);
		font-weight: 650;
	}

	&__name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__count {
		flex-shrink: 0;
		min-width: 22px;
		padding: 1px map.get($spacers, 2);
		border-radius: 99px;
		background: var(--mt-color-white);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
		text-align: center;
	}

	&__more {
		display: flex;
		padding: map.get($spacers, 1);
		border: 0;
		border-radius: var(--mt-radius-sm);
		background: transparent;
		color: var(--mt-color-gray-400);
		cursor: pointer;

		&:hover {
			background: var(--mt-color-white);
			color: var(--mt-color-text);
		}
	}

	// Форма редактирования выводится поверх колонки и не ограничена её шириной
	&__edit {
		position: absolute;
		z-index: 20;
		top: map.get($spacers, 2);
		left: map.get($spacers, 2);
		right: map.get($spacers, 2);
		box-sizing: border-box;
		box-shadow: var(--mt-shadow-hover);
	}

	&__quick {
		position: relative;
		flex-shrink: 0;
		margin-bottom: map.get($spacers, 2);
	}

	&__hint {
		position: absolute;
		z-index: 5;
		top: calc(100% + 4px);
		right: 0;
		left: 0;
		margin: 0;
		padding: map.get($spacers, 2) map.get($spacers, 3);
		border-radius: var(--mt-radius-sm);
		background: var(--mt-color-white);
		box-shadow: var(--mt-shadow-hover);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
		text-align: center;
		pointer-events: none;
	}

	&__danger {
		color: var(--mt-color-danger);
	}

	&__add {
		box-sizing: border-box;
		width: 100%;
		padding: map.get($spacers, 2) map.get($spacers, 3);
		border: 1px dashed var(--mt-color-gray-300);
		border-radius: var(--mt-radius-sm);
		outline: 0;
		background: transparent;
		color: var(--mt-color-text);
		font: inherit;
		font-size: map.get($font-sizes, 6);
		text-align: left;

		&::placeholder {
			color: var(--mt-color-gray-500);
		}

		&:focus {
			border-style: solid;
			border-color: var(--mt-color-primary);
			background: var(--mt-color-white);
		}
		transition:
			background 0.18s var(--mt-ease),
			color 0.18s var(--mt-ease),
			border-color 0.18s var(--mt-ease);

		&:hover {
			border-color: var(--mt-color-primary);
			background: var(--mt-color-white);
		}
	}

	&__list {
		flex: 1 0 auto;
		min-height: 120px;
		user-select: none;
	}

	&__ghost {
		opacity: 0.4;
	}
}
</style>
