<script lang="ts" setup>
import { computed, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { BriefTask } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { statusLabel, statusTagType } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import { CircleCheck, CircleCheckFilled } from "@/shared/ui/icon/icons";

const emit = defineEmits<{
	open: [taskId: string];
	changed: [];
}>();

const props = defineProps<{
	taskId: string;
	projectId: string;
	canCreate?: boolean;
}>();

const newTitle = ref("");
const isCreating = ref(false);

const { state, fetch } = useFetch(baseApi.tasks.getSubtasks, "data", {
	immediate: true,
	pathParams: computed(() => ({ id: props.taskId })),
});

const subtasks = computed(() => (state.value ?? []) as BriefTask[]);
const isDone = (task: BriefTask) => task.status === "DONE" || task.isCompleted;
const doneCount = computed(() => subtasks.value.filter(isDone).length);

const handleCreate = async (event: KeyboardEvent) => {
	if (event.isComposing) return;
	const title = newTitle.value.trim();
	if (!title || isCreating.value) return;
	isCreating.value = true;
	try {
		await baseApi.tasks.createTask({ id: props.projectId }, undefined, { title, parentTaskId: props.taskId });
		newTitle.value = "";
		await fetch();
		emit("changed");
	} finally {
		isCreating.value = false;
	}
};
</script>

<template>
	<section class="task-subtasks">
		<base-flex align="center" justify="space-between">
			<h3>{{ translate("task.subtasks") }}</h3>
			<span v-if="subtasks.length" class="task-subtasks__progress">{{ doneCount }} / {{ subtasks.length }}</span>
		</base-flex>
		<ul v-if="subtasks.length" class="task-subtasks__list">
			<li v-for="item in subtasks" :key="item.id">
				<button class="task-subtasks__item" type="button" @click="() => emit('open', item.id)">
					<el-icon
						class="task-subtasks__check"
						:class="{ 'task-subtasks__check--done': isDone(item) }"
						:size="16"
						aria-hidden="true"
					>
						<circle-check-filled v-if="isDone(item)" />
						<circle-check v-else />
					</el-icon>
					<span class="task-subtasks__title" :class="{ 'task-subtasks__title--done': isDone(item) }">
						{{ item.title }}
					</span>
					<el-tag :type="statusTagType[item.status]" size="small">{{ statusLabel(item.status) }}</el-tag>
				</button>
			</li>
		</ul>
		<el-input
			v-if="canCreate"
			v-model="newTitle"
			class="task-subtasks__add"
			maxlength="255"
			:disabled="isCreating"
			:placeholder="translate('task.addSubtask')"
			@keydown.enter.prevent="handleCreate"
		/>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.task-subtasks {
	h3 {
		margin: 0;
		font-size: map.get($font-sizes, 6);
		font-weight: 600;
	}

	&__progress {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
	}

	&__list {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 1);
		margin: map.get($spacers, 3) 0 0;
		padding: 0;
		list-style: none;
	}

	&__item {
		display: flex;
		align-items: center;
		gap: map.get($spacers, 2);
		width: 100%;
		padding: map.get($spacers, 2);
		border: 0;
		border-radius: var(--mt-radius-sm);
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: map.get($font-sizes, 6);
		text-align: left;
		cursor: pointer;

		&:hover {
			background: var(--mt-color-gray-50);
		}
	}

	&__check {
		flex-shrink: 0;
		color: var(--mt-color-gray-300);

		&--done {
			color: var(--mt-color-success);
		}
	}

	&__title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;

		&--done {
			color: var(--mt-color-gray-400);
			text-decoration: line-through;
		}
	}

	&__add {
		margin-top: map.get($spacers, 3);

		:deep(.el-input__wrapper) {
			box-shadow: 0 0 0 1px var(--mt-color-gray-300) inset;
		}
	}
}
</style>
