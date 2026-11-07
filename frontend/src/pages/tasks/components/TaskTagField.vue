<script lang="ts" setup>
import { Plus } from "@/shared/ui/icon/icons";
import { computed, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { Tag } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseColorTag from "@/shared/ui/tag/BaseColorTag.vue";

const emit = defineEmits<{
	toggle: [tagId: string];
	created: [tagId: string];
}>();

const props = defineProps<{
	tags: Tag[];
	selectedIds: string[];
	projectId: string;
}>();

const newTagName = ref("");
const newTagColor = ref<string | null>("#2563EB");

const selectedTags = computed(() => props.tags.filter((tag) => props.selectedIds.includes(tag.id)));

const { fetch: createTag } = useFetch(baseApi.projects.createProjectTag, "data", {
	pathParams: computed(() => ({ id: props.projectId })),
	autoFetch: false,
	resetOnFetch: false,
});

const handleToggle = (tagId: string) => emit("toggle", tagId);

const handleCreate = async () => {
	if (!newTagName.value.trim() || !props.projectId) return;
	const created = await createTag({
		payload: { name: newTagName.value.trim(), color: newTagColor.value || "#2563EB" },
	});
	newTagName.value = "";
	if (created?.id) emit("created", created.id);
};
</script>

<template>
	<base-flex align="center" :gap="2" wrap="wrap">
		<base-color-tag
			v-for="tag in selectedTags"
			:key="tag.id"
			:tag="tag"
			closable
			@remove="() => handleToggle(tag.id)"
		/>
		<el-popover trigger="click" :width="280">
			<base-flex direction="column" :gap="3">
				<div v-if="tags.length" class="task-tag-field__options">
					<button
						v-for="tag in tags"
						:key="tag.id"
						class="task-tag-field__option"
						type="button"
						@click="() => handleToggle(tag.id)"
					>
						<base-color-tag :tag="tag" />
					</button>
				</div>
				<el-input v-model="newTagName" :placeholder="translate('task.tagName')" />
				<el-color-picker v-model="newTagColor" color-format="hex" :teleported="false" />
				<base-flex justify="flex-start">
					<base-button type="primary" @click="handleCreate">{{ translate("task.addTag") }}</base-button>
				</base-flex>
			</base-flex>
			<template #reference>
				<button class="task-tag-field__plus" type="button">
					<el-icon :size="16"><plus /></el-icon>
				</button>
			</template>
		</el-popover>
	</base-flex>
</template>

<style scoped lang="scss">
.task-tag-field {
	&__options {
		max-height: var(--mt-popup-max-height);
		overflow-y: auto;
	}

	&__option {
		padding: 0;
		border: 0;
		background: transparent;
		text-align: left;
		cursor: pointer;
	}

	&__plus {
		width: 28px;
		height: 28px;
		border: 1px solid var(--mt-color-gray-200);
		border-radius: 50%;
		background: var(--mt-color-white);
		color: var(--mt-color-gray-400);
		cursor: pointer;
	}
}
</style>
