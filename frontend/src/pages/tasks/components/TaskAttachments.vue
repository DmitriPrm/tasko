<script lang="ts" setup>
import { ElMessage } from "element-plus";
import { computed, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import { downloadTaskAttachment } from "@/shared/api/v0/attachments/attachments";
import type { Attachment } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { formatDateTime } from "@/shared/lib/helpers/formatDate";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseIconButton from "@/shared/ui/button/BaseIconButton.vue";
import { Delete, Memo } from "@/shared/ui/icon/icons";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.csv,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

const emit = defineEmits<{
	changed: [];
}>();

const props = defineProps<{
	taskId: string;
	/** Может удалять чужие вложения (редактор задачи); свои удалить может каждый */
	canManage?: boolean;
	currentUserId?: string;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);

const { state, fetch } = useFetch(baseApi.attachments.getTaskAttachments, "data", {
	immediate: true,
	pathParams: computed(() => ({ id: props.taskId })),
});

const items = computed(() => (state.value ?? []) as Attachment[]);

const formatSize = (bytes: number) => {
	if (bytes < 1024) return `${bytes} Б`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
	return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
};

const canRemove = (item: Attachment) => props.canManage || item.uploader.id === props.currentUserId;

const handlePick = () => fileInput.value?.click();

const handleFile = async (event: Event) => {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = "";
	if (!file) return;
	if (file.size > MAX_BYTES) {
		ElMessage({ type: "error", message: translate("task.attachTooBig") });
		return;
	}
	isUploading.value = true;
	try {
		const body = new FormData();
		body.append("file", file);
		await baseApi.attachments.uploadTaskAttachment({ id: props.taskId }, undefined, body);
		await fetch();
		emit("changed");
	} finally {
		isUploading.value = false;
	}
};

const handleDownload = (item: Attachment) => downloadTaskAttachment(props.taskId, item.id, item.originalName);

const handleRemove = async (item: Attachment) => {
	await baseApi.attachments.deleteTaskAttachment({ id: props.taskId, attachmentId: item.id });
	await fetch();
	emit("changed");
};
</script>

<template>
	<section class="task-attachments">
		<base-flex align="center" justify="space-between" :gap="3">
			<h3>{{ translate("task.attachments") }}</h3>
			<base-button text type="primary" :loading="isUploading" @click="handlePick">
				{{ translate("task.attach") }}
			</base-button>
			<input ref="fileInput" class="task-attachments__input" type="file" :accept="ACCEPT" @change="handleFile" />
		</base-flex>
		<ul v-if="items.length" class="task-attachments__list">
			<li v-for="item in items" :key="item.id">
				<el-icon class="task-attachments__icon" :size="18" aria-hidden="true"><memo /></el-icon>
				<button
					class="task-attachments__name"
					type="button"
					:title="translate('task.download')"
					@click="() => handleDownload(item)"
				>
					{{ item.originalName }}
				</button>
				<span class="task-attachments__meta">
					{{ formatSize(item.sizeBytes) }} · {{ item.uploader.fullName }} · {{ formatDateTime(item.createdAt) }}
				</span>
				<base-icon-button
					v-if="canRemove(item)"
					:label="translate('task.removeAttachment')"
					danger
					@click="() => handleRemove(item)"
				>
					<el-icon :size="14"><delete /></el-icon>
				</base-icon-button>
			</li>
		</ul>
		<p v-else class="task-attachments__hint">{{ translate("task.attachHint") }}</p>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.task-attachments {
	h3 {
		margin: 0;
		font-size: map.get($font-sizes, 6);
		font-weight: 600;
	}

	&__input {
		display: none;
	}

	&__hint {
		margin: map.get($spacers, 2) 0 0;
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 7);
	}

	&__list {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 1);
		margin: map.get($spacers, 2) 0 0;
		padding: 0;
		list-style: none;

		li {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) auto;
			grid-template-areas:
				"icon name action"
				"icon meta action";
			align-items: center;
			column-gap: map.get($spacers, 2);
			padding: map.get($spacers, 2);
			border-radius: var(--mt-radius-sm);

			&:hover {
				background: var(--mt-color-gray-50);
			}
		}
	}

	&__icon {
		grid-area: icon;
		color: var(--mt-color-gray-400);
	}

	&__name {
		grid-area: name;
		overflow: hidden;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--mt-color-text);
		font: inherit;
		font-size: map.get($font-sizes, 6);
		font-weight: 500;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
		cursor: pointer;

		&:hover {
			color: var(--mt-color-primary);
		}
	}

	&__meta {
		grid-area: meta;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}

	:deep(.base-icon-button) {
		grid-area: action;
	}
}
</style>
