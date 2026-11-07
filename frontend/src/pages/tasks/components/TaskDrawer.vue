<script lang="ts" setup>
import { CircleCheck, CircleCheckFilled, Plus, Close } from "@/shared/ui/icon/icons";
import dayjs from "dayjs";
import { computed, ref, watch } from "vue";

import TaskComments from "@/pages/tasks/components/TaskComments.vue";
import TaskHistory from "@/pages/tasks/components/TaskHistory.vue";
import TaskTagField from "@/pages/tasks/components/TaskTagField.vue";
import { baseApi } from "@/shared/api/baseApi";
import type { ProjectMember, Tag, TaskPriority, TaskStatus, User } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { openConfirm } from "@/shared/lib/dialog/openConfirm";
import { DATE_FIELD_FORMAT, toIsoDate } from "@/shared/lib/helpers/formatDate";
import { TASK_TRANSITIONS } from "@/shared/lib/helpers/taskTransitions";
import { priorityLabel, statusLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseDescriptionItem from "@/shared/ui/description/BaseDescriptionItem.vue";
import BaseDescriptionList from "@/shared/ui/description/BaseDescriptionList.vue";
import BaseDrawer from "@/shared/ui/drawer/BaseDrawer.vue";
import BaseUserSelect from "@/shared/ui/select/BaseUserSelect.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";

const emit = defineEmits<{
	"update:taskId": [value: string | null];
	updated: [];
	deleted: [];
}>();

const props = defineProps<{
	taskId?: string | null;
}>();

const visible = computed({
	get: () => Boolean(props.taskId),
	set: (value) => {
		if (!value) emit("update:taskId", null);
	},
});

const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const title = ref("");
const description = ref("");
const priority = ref<TaskPriority>("MEDIUM");
const assigneeId = ref<string | "">("");
const deadlineAt = ref<string | "">("");
const selectedTagIds = ref<string[]>([]);
const coAssigneeIds = ref<string[]>([]);
const isCompleted = ref(false);

const taskPath = computed(() => ({ id: props.taskId || "" }));
const projectPath = computed(() => ({ id: task.value?.projectId || "" }));

const { state: task, fetch: fetchTask } = useFetch(baseApi.tasks.getTask, "data", {
	pathParams: taskPath,
	autoFetch: false,
	autoCancel: true,
});

const { state: project, fetch: fetchProject } = useFetch(baseApi.projects.getProject, "data", {
	pathParams: projectPath,
	autoFetch: false,
});

const { state: tagsState, fetch: fetchTags } = useFetch(baseApi.projects.getProjectTags, "data", {
	pathParams: projectPath,
	autoFetch: false,
});

const { fetch: saveTask, isLoading: isSaving } = useFetch(baseApi.tasks.updateTask, "data", {
	pathParams: taskPath,
	autoFetch: false,
	resetOnFetch: false,
});

const { fetch: removeTask, isLoading: isDeleting } = useFetch(baseApi.tasks.deleteTask, "data", {
	pathParams: taskPath,
	autoFetch: false,
	resetOnFetch: false,
});

const { fetch: transitionTask } = useFetch(baseApi.tasks.transitionTask, "data", {
	pathParams: taskPath,
	autoFetch: false,
	resetOnFetch: false,
});

const memberUsers = computed(() =>
	((project.value?.members || []) as ProjectMember[]).map((member) => member.user),
);
const availableCoAssignees = computed(() =>
	memberUsers.value.filter((user) => user.id !== assigneeId.value),
);
const projectTags = computed(() => (tagsState.value || []) as Tag[]);
const availableTransitions = computed(() => {
	const status = task.value?.status as TaskStatus | undefined;
	return status ? TASK_TRANSITIONS[status] : [];
});

const syncForm = () => {
	if (!task.value) return;
	title.value = task.value.title;
	description.value = task.value.description || "";
	priority.value = task.value.priority;
	assigneeId.value = task.value.assigneeId || "";
	deadlineAt.value = task.value.deadlineAt ? dayjs(task.value.deadlineAt).format("YYYY-MM-DD") : "";
	selectedTagIds.value = (task.value.tags || []).map((tag: Tag) => tag.id);
	coAssigneeIds.value = (task.value.coAssignees || []).map((user: User) => user.id);
	isCompleted.value = Boolean(task.value.isCompleted);
};

watch(
	() => props.taskId,
	async (id) => {
		if (!id) return;
		await fetchTask().catch(() => false);
		if (props.taskId !== id || task.value?.id !== id) return;
		syncForm();
		if (task.value?.projectId) {
			await Promise.all([fetchTags().catch(() => false), fetchProject().catch(() => false)]);
		}
	},
	{ immediate: true },
);

const handleClose = () => emit("update:taskId", null);

const handleSave = async () => {
	if (!props.taskId) return;
	await saveTask({
		payload: {
			title: title.value,
			description: description.value,
			priority: priority.value,
			assigneeId: assigneeId.value || null,
			deadlineAt: toIsoDate(deadlineAt.value),
			isCompleted: isCompleted.value,
			tagIds: selectedTagIds.value,
			coAssigneeIds: coAssigneeIds.value,
		},
	});
	emit("updated");
	await fetchTask();
	syncForm();
};

const handleDelete = async () => {
	if (!props.taskId) return;
	const confirmed = await openConfirm({ title: translate("task.delete") });
	if (!confirmed) return;
	await removeTask();
	emit("deleted");
	handleClose();
};

const handleToggleCompleted = async () => {
	isCompleted.value = !isCompleted.value;
	await saveTask({ payload: { isCompleted: isCompleted.value } });
	emit("updated");
	await fetchTask();
	syncForm();
};

const handleStatus = async (status: TaskStatus) => {
	await transitionTask({ payload: { status } });
	emit("updated");
	await fetchTask();
};

const handleClearDeadline = () => {
	deadlineAt.value = "";
};

const handleToggleTag = (tagId: string) => {
	if (selectedTagIds.value.includes(tagId)) {
		selectedTagIds.value = selectedTagIds.value.filter((id) => id !== tagId);
		return;
	}
	selectedTagIds.value = [...selectedTagIds.value, tagId];
};

const handleTagCreated = async (tagId: string) => {
	await fetchTags();
	if (!selectedTagIds.value.includes(tagId)) {
		selectedTagIds.value = [...selectedTagIds.value, tagId];
	}
};

const handlePriority = (value: TaskPriority) => {
	priority.value = value;
};

const handleAssigneeChange = (value: string | string[]) => {
	assigneeId.value = Array.isArray(value) ? value[0] || "" : value;
};

const handleCoAssigneesChange = (value: string | string[]) => {
	coAssigneeIds.value = Array.isArray(value) ? value : value ? [value] : [];
};

const handleDeadlineChange = (value: string | "") => {
	deadlineAt.value = value;
};

const findUser = (userId: string): User | undefined => memberUsers.value.find((user) => user.id === userId);
</script>

<template>
	<base-drawer v-model="visible" width="560px">
		<template #header>
			<base-flex class="task-drawer__heading" align="flex-start" :gap="2">
				<button class="task-drawer__check-btn" type="button" @click="handleToggleCompleted">
					<el-icon
						class="task-drawer__check"
						:class="{ 'task-drawer__check--done': isCompleted }"
						:size="20"
					>
						<circle-check-filled v-if="isCompleted" />
						<circle-check v-else />
					</el-icon>
				</button>
				<base-flex direction="column" :gap="1">
					<el-input v-model="title" class="task-drawer__title" />
					<el-dropdown v-if="task && availableTransitions.length" trigger="click">
						<button class="task-drawer__status" type="button">{{ statusLabel(task.status) }}</button>
						<template #dropdown>
							<el-dropdown-menu class="task-drawer__statuses">
								<el-dropdown-item
									v-for="status in availableTransitions"
									:key="status"
									@click="() => handleStatus(status)"
								>
									{{ statusLabel(status) }}
								</el-dropdown-item>
							</el-dropdown-menu>
						</template>
					</el-dropdown>
					<span v-else-if="task" class="task-drawer__status">{{ statusLabel(task.status) }}</span>
				</base-flex>
			</base-flex>
		</template>

		<el-skeleton :loading="!task" animated>
			<base-flex v-if="task" direction="column" :gap="5">
				<base-description-list class="task-drawer__meta">
					<base-description-item :label="translate('task.assignee')">
						<base-user-select
							class="task-drawer__control"
							:model-value="assigneeId"
							:users="memberUsers"
							clearable
							@update:model-value="handleAssigneeChange"
						/>
					</base-description-item>
					<base-description-item :label="translate('task.author')">
						<base-user-name :user="task.author" />
					</base-description-item>
					<base-description-item :label="translate('task.priority')">
						<el-select
							class="task-drawer__control"
							:model-value="priority"
							@change="(value: TaskPriority) => handlePriority(value)"
						>
							<el-option v-for="item in priorities" :key="item" :label="priorityLabel(item)" :value="item" />
						</el-select>
					</base-description-item>
					<base-description-item :label="translate('task.coAssignees')">
						<base-flex align="center" :gap="2" wrap="wrap">
							<base-user-name
								v-for="userId in coAssigneeIds"
								:key="userId"
								:user="findUser(userId)"
								icon-only
								:size="24"
							/>
							<el-popover trigger="click" :width="260">
								<base-user-select
									:model-value="coAssigneeIds"
									:users="availableCoAssignees"
									multiple
									@update:model-value="handleCoAssigneesChange"
								/>
								<template #reference>
									<button class="task-drawer__plus" type="button">
										<el-icon :size="16"><plus /></el-icon>
									</button>
								</template>
							</el-popover>
						</base-flex>
					</base-description-item>
					<base-description-item :label="translate('task.deadlineAt')">
						<base-flex align="center" :gap="2">
							<el-date-picker
								:model-value="deadlineAt"
								class="task-drawer__date"
								type="date"
								:format="DATE_FIELD_FORMAT"
								value-format="YYYY-MM-DD"
								:placeholder="translate('task.deadline')"
								@update:model-value="(value: string) => handleDeadlineChange(value || '')"
							/>
							<button v-if="deadlineAt" class="task-drawer__clear" type="button" @click="handleClearDeadline">
								<el-icon :size="14"><close /></el-icon>
							</button>
						</base-flex>
					</base-description-item>
					<base-description-item :label="translate('task.tags')">
						<task-tag-field
							:tags="projectTags"
							:selected-ids="selectedTagIds"
							:project-id="task.projectId"
							@toggle="(tagId) => handleToggleTag(tagId)"
							@created="(tagId) => handleTagCreated(tagId)"
						/>
					</base-description-item>
				</base-description-list>

				<base-flex direction="column" :gap="2">
					<span class="task-drawer__label">{{ translate("task.description") }}</span>
					<el-input
						v-model="description"
						type="textarea"
						:rows="4"
						:placeholder="translate('task.descriptionPlaceholder')"
					/>
				</base-flex>

				<base-flex justify="flex-start" :gap="3">
					<base-button type="primary" :loading="isSaving" @click="handleSave">
						{{ translate("common.save") }}
					</base-button>
					<base-button type="danger" :loading="isDeleting" @click="handleDelete">
						{{ translate("task.delete") }}
					</base-button>
				</base-flex>

				<task-history v-if="taskId" :task-id="taskId" />
				<task-comments v-if="taskId" :task-id="taskId" />
			</base-flex>
		</el-skeleton>
	</base-drawer>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

:global(.task-drawer__statuses) {
	max-height: var(--mt-popup-max-height);
	overflow-y: auto;
}

.task-drawer {
	&__heading {
		flex: 1;
		min-width: 0;
	}

	&__check-btn {
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
	}

	&__check {
		margin-top: map.get($spacers, 1);
		color: var(--mt-color-gray-300);
		transition: color 0.18s var(--mt-ease);

		&:hover {
			color: var(--mt-color-success);
		}

		&--done {
			color: var(--mt-color-success);
		}
	}

	&__title {
		:deep(.el-input__wrapper) {
			padding-left: 0;
			background: transparent;
			box-shadow: none;
			font-size: map.get($font-sizes, 3);
			font-weight: 650;
			letter-spacing: -0.015em;
		}
	}

	&__status {
		align-self: flex-start;
		padding: 2px map.get($spacers, 3);
		border: 0;
		border-radius: 99px;
		background: var(--mt-color-primary-light);
		color: var(--mt-color-primary);
		font: inherit;
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
		cursor: pointer;
	}

	&__meta {
		:deep(.base-description-item__label),
		:deep(.base-description-item__value) {
			padding-bottom: map.get($spacers, 3);
			border-bottom: 1px solid var(--mt-color-gray-100);
		}
	}

	&__label {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
		font-weight: 500;
	}

	&__control,
	&__date {
		width: 100%;
		max-width: 280px;
	}

	&__plus,
	&__clear {
		width: 28px;
		height: 28px;
		border: 1px dashed var(--mt-color-gray-300);
		border-radius: 50%;
		background: var(--mt-color-white);
		color: var(--mt-color-gray-400);
		cursor: pointer;
		transition:
			border-color 0.18s var(--mt-ease),
			color 0.18s var(--mt-ease);

		&:hover {
			border-color: var(--mt-color-primary);
			color: var(--mt-color-primary);
		}
	}
}
</style>
