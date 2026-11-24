<script lang="ts" setup>
import { computed, nextTick, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { TaskComment } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { openConfirm } from "@/shared/lib/dialog/openConfirm";
import { formatDateTime } from "@/shared/lib/helpers/formatDate";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseIconButton from "@/shared/ui/button/BaseIconButton.vue";
import { Delete, Edit } from "@/shared/ui/icon/icons";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";
import { useAuthStore } from "@/store/auth";

/**
 * Комментарии к задаче. Свой комментарий можно исправить (с пометкой «изменён») и удалить;
 * руководитель проекта и администратор могут удалить любой.
 */
const props = defineProps<{
	taskId: string;
}>();

const authStore = useAuthStore();
const body = ref("");
const taskPath = computed(() => ({ id: props.taskId }));

const { state, fetch } = useFetch(baseApi.comments.getTaskComments, "data", {
	immediate: true,
	pathParams: taskPath,
});
const comments = computed(() => (state.value ?? []) as TaskComment[]);

const { fetch: sendComment, isLoading } = useFetch(baseApi.comments.createTaskComment, "data", {
	pathParams: taskPath,
	autoFetch: false,
	resetOnFetch: false,
});

const handleSend = async () => {
	if (!body.value.trim()) return;
	await sendComment({ payload: { body: body.value } });
	body.value = "";
	await fetch();
};

// --- правка: одна открытая форма за раз
const editingId = ref<string | null>(null);
const draft = ref("");
const isSaving = ref(false);
const editInput = ref<{ focus: () => void } | null>(null);

const handleEdit = async (comment: TaskComment) => {
	editingId.value = comment.id;
	draft.value = comment.body;
	await nextTick();
	editInput.value?.focus();
};

const handleCancelEdit = () => {
	editingId.value = null;
	draft.value = "";
};

const handleSaveEdit = async (comment: TaskComment) => {
	const text = draft.value.trim();
	if (!text || isSaving.value) return;
	if (text === comment.body) return handleCancelEdit();
	isSaving.value = true;
	try {
		await baseApi.comments.updateTaskComment({ id: props.taskId, commentId: comment.id }, undefined, { body: text });
		handleCancelEdit();
		await fetch();
	} finally {
		isSaving.value = false;
	}
};

/** Ctrl/Cmd+Enter — сохранить, Esc — отменить */
const handleEditKeydown = (event: KeyboardEvent, comment: TaskComment) => {
	if (event.key === "Escape") {
		event.stopPropagation();
		handleCancelEdit();
	} else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
		event.preventDefault();
		handleSaveEdit(comment);
	}
};

const handleDelete = async (comment: TaskComment) => {
	const confirmed = await openConfirm({
		title: translate("task.deleteComment"),
		text:
			comment.authorId === authStore.user?.id
				? translate("task.deleteCommentText")
				: translate("task.deleteCommentForeign"),
		confirmLabel: translate("common.delete"),
	});
	if (!confirmed) return;
	await baseApi.comments.deleteTaskComment({ id: props.taskId, commentId: comment.id });
	if (editingId.value === comment.id) handleCancelEdit();
	await fetch();
};
</script>

<template>
	<section class="task-comments">
		<h3>{{ translate("task.comments") }}</h3>
		<base-flex direction="column" :gap="4">
			<article v-for="comment in comments" :key="comment.id" class="task-comments__item">
				<base-flex direction="column" :gap="1">
					<base-flex align="center" justify="space-between" :gap="2">
						<base-flex align="center" :gap="2" wrap="wrap">
							<base-user-name :user="comment.author" :size="28" />
							<span class="task-comments__date">
								{{ formatDateTime(comment.createdAt) }}
								<span v-if="comment.edited" :title="formatDateTime(comment.updatedAt)">
									· {{ translate("task.commentEdited") }}
								</span>
							</span>
						</base-flex>
						<span v-if="editingId !== comment.id" class="task-comments__actions">
							<base-icon-button
								v-if="comment.canEdit"
								:label="translate('task.editComment')"
								@click="() => handleEdit(comment)"
							>
								<el-icon :size="14"><edit /></el-icon>
							</base-icon-button>
							<base-icon-button
								v-if="comment.canDelete"
								:label="translate('task.deleteComment')"
								danger
								@click="() => handleDelete(comment)"
							>
								<el-icon :size="14"><delete /></el-icon>
							</base-icon-button>
						</span>
					</base-flex>

					<base-flex v-if="editingId === comment.id" direction="column" :gap="2">
						<el-input
							ref="editInput"
							v-model="draft"
							type="textarea"
							:autosize="{ minRows: 2, maxRows: 8 }"
							maxlength="4000"
							@keydown="(event: KeyboardEvent) => handleEditKeydown(event, comment)"
						/>
						<base-flex :gap="2" align="center">
							<base-button
								type="primary"
								:loading="isSaving"
								:disabled="!draft.trim()"
								@click="() => handleSaveEdit(comment)"
							>
								{{ translate("common.save") }}
							</base-button>
							<base-button @click="handleCancelEdit">{{ translate("common.cancel") }}</base-button>
							<span class="task-comments__hint">{{ translate("task.commentEditHint") }}</span>
						</base-flex>
					</base-flex>
					<p v-else>{{ comment.body }}</p>
				</base-flex>
			</article>
		</base-flex>
		<base-flex class="task-comments__composer" direction="column" :gap="3">
			<base-flex align="flex-start" :gap="3">
				<base-user-name :user="authStore.user" icon-only :size="28" />
				<el-input v-model="body" type="textarea" :rows="3" :placeholder="translate('task.commentPlaceholder')" />
			</base-flex>
			<base-flex justify="flex-start">
				<base-button type="primary" :loading="isLoading" @click="handleSend">
					{{ translate("task.send") }}
				</base-button>
			</base-flex>
		</base-flex>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.task-comments {
	h3 {
		margin: 0 0 map.get($spacers, 4);
		font-size: map.get($font-sizes, 6);
		font-weight: 600;
	}

	&__item {
		p {
			margin: 0;
			font-size: map.get($font-sizes, 6);
			white-space: pre-wrap;
			overflow-wrap: anywhere;
		}

		/* Кнопки видны при наведении, на сенсорных экранах — всегда */
		&:hover .task-comments__actions,
		&:focus-within .task-comments__actions {
			opacity: 1;
		}
	}

	&__actions {
		display: inline-flex;
		flex-shrink: 0;
		opacity: 0;
		transition: opacity 0.15s var(--mt-ease);

		@media (hover: none) {
			opacity: 1;
		}
	}

	&__date {
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 8);
	}

	&__hint {
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 8);
	}

	&__composer {
		margin-top: map.get($spacers, 4);
	}
}
</style>
