<script lang="ts" setup>
import { CircleCheck, CircleCheckFilled, Plus } from "@/shared/ui/icon/icons";
import dayjs from "dayjs";
import { computed, ref } from "vue";

import type { ProjectMember, Task } from "@/shared/api/v0/schemas";
import { DATE_FIELD_FORMAT, formatDate, isTaskOverdue, toIsoDate } from "@/shared/lib/helpers/formatDate";
import { priorityLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import BaseUserSelect from "@/shared/ui/select/BaseUserSelect.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";

const emit = defineEmits<{
	open: [taskId: string];
	complete: [taskId: string];
	"change-assignee": [payload: { taskId: string; assigneeId: string | null }];
	"change-deadline": [payload: { taskId: string; deadlineAt: string | null }];
}>();

const props = defineProps<{
	task: Task;
	members?: ProjectMember[];
}>();

const isAssigneeOpen = ref(false);
const isDeadlineOpen = ref(false);

const memberUsers = computed(() => (props.members || []).map((member) => member.user));
const deadlineValue = computed(() =>
	props.task.deadlineAt ? dayjs(props.task.deadlineAt).format("YYYY-MM-DD") : "",
);

const handleOpen = () => emit("open", props.task.id);
const handleComplete = (event: Event) => {
	event.stopPropagation();
	emit("complete", props.task.id);
};

const handleStop = (event: Event) => {
	event.stopPropagation();
};

const handleAssignee = (value: string | string[]) => {
	const assigneeId = Array.isArray(value) ? value[0] || null : value || null;
	emit("change-assignee", { taskId: props.task.id, assigneeId });
	isAssigneeOpen.value = false;
};

const handleDeadline = (value: string | "") => {
	emit("change-deadline", {
		taskId: props.task.id,
		deadlineAt: toIsoDate(value),
	});
	isDeadlineOpen.value = false;
};
</script>

<template>
	<base-card class="project-board-card" @click="handleOpen">
		<base-flex align="flex-start" :gap="2">
			<button class="project-board-card__check-btn" type="button" @click="(event) => handleComplete(event)">
				<el-icon
					class="project-board-card__check"
					:class="{ 'project-board-card__check--done': task.isCompleted }"
					:size="18"
				>
					<circle-check-filled v-if="task.isCompleted" />
					<circle-check v-else />
				</el-icon>
			</button>
			<base-flex direction="column" :gap="3" width="full">
				<strong
					class="project-board-card__title"
					:class="{ 'project-board-card__title--done': task.isCompleted }"
				>
					{{ task.title }}
				</strong>
				<span class="project-board-card__priority">{{ priorityLabel(task.priority) }}</span>
				<base-flex v-if="task.tags?.length" :gap="2" wrap="wrap">
					<span
						v-for="tag in task.tags"
						:key="tag.id"
						class="project-board-card__tag"
						:style="{ color: tag.color }"
					>
						{{ tag.name }}
					</span>
				</base-flex>
				<base-flex align="center" justify="space-between" :gap="2">
					<el-popover v-model:visible="isDeadlineOpen" trigger="click" :width="260" persistent>
						<el-date-picker
							:model-value="deadlineValue"
							type="date"
							:format="DATE_FIELD_FORMAT"
							value-format="YYYY-MM-DD"
							:teleported="false"
							:placeholder="translate('task.deadline')"
							@update:model-value="(value: string) => handleDeadline(value || '')"
						/>
						<template #reference>
							<button
								class="project-board-card__date"
								:class="{ 								'project-board-card__date--overdue': isTaskOverdue(task) }"
								type="button"
								@click="handleStop"
								@mousedown="handleStop"
							>
								{{ formatDate(task.deadlineAt) || translate("task.deadline") }}
							</button>
						</template>
					</el-popover>
					<el-popover v-model:visible="isAssigneeOpen" trigger="click" :width="240" persistent>
						<base-user-select
							:model-value="task.assigneeId || ''"
							:users="memberUsers"
							clearable
							:teleported="false"
							@update:model-value="handleAssignee"
						/>
						<template #reference>
							<button
								class="project-board-card__assignee"
								type="button"
								@click="handleStop"
								@mousedown="handleStop"
							>
								<base-user-name v-if="task.assignee" :user="task.assignee" icon-only :size="24" :link="false" />
								<base-flex
									v-else
									class="project-board-card__assignee-empty"
									align="center"
									justify="center"
								>
									<el-icon :size="14"><plus /></el-icon>
								</base-flex>
							</button>
						</template>
					</el-popover>
				</base-flex>
			</base-flex>
		</base-flex>
	</base-card>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.project-board-card {
	margin-bottom: map.get($spacers, 2);
	padding: map.get($spacers, 3) map.get($spacers, 4);
	border-radius: var(--mt-radius-sm);
	cursor: grab;
	user-select: none;

	&:hover {
		border-color: var(--mt-color-primary-light);
		box-shadow: var(--mt-shadow-hover);
	}

	&:active {
		cursor: grabbing;
	}

	&__check-btn {
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
	}

	&__check {
		margin-top: 1px;
		color: var(--mt-color-gray-300);
		transition:
			color 0.18s var(--mt-ease),
			transform 0.18s var(--mt-ease);

		&:hover {
			color: var(--mt-color-success);
			transform: scale(1.1);
		}

		&--done {
			color: var(--mt-color-success);
		}
	}

	&__title {
		font-size: map.get($font-sizes, 6);
		font-weight: 550;

		&--done {
			color: var(--mt-color-gray-400);
			text-decoration: line-through;
		}
	}

	&__tag {
		padding: 1px map.get($spacers, 2);
		border-radius: 99px;
		background: var(--mt-color-gray-50);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
	}

	&__priority {
		align-self: flex-start;
		padding: 1px map.get($spacers, 2);
		border-radius: 6px;
		background: var(--mt-color-gray-50);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
	}

	&__date {
		padding: 2px map.get($spacers, 2);
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--mt-color-gray-500);
		font: inherit;
		font-size: map.get($font-sizes, 8);
		cursor: pointer;

		&:hover {
			background: var(--mt-color-gray-50);
		}

		&--overdue {
			background: var(--mt-color-danger-light);
			color: var(--mt-color-danger);
			font-weight: 600;
		}
	}

	&__assignee {
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
	}

	&__assignee-empty {
		width: 24px;
		height: 24px;
		border: 1px dashed var(--mt-color-gray-300);
		border-radius: 50%;
		color: var(--mt-color-gray-400);

		&:hover {
			border-color: var(--mt-color-primary);
			color: var(--mt-color-primary);
		}
	}
}
</style>
