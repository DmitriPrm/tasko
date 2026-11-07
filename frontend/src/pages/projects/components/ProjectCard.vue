<script lang="ts" setup>
import { Edit } from "@/shared/ui/icon/icons";
import { useRouter } from "vue-router";

import type { Project } from "@/shared/api/v0/schemas";
import { projectStatusDot, projectStatusLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import BaseIconButton from "@/shared/ui/button/BaseIconButton.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";

const emit = defineEmits<{
	edit: [id: string];
}>();

const props = defineProps<{
	project: Project;
	editable?: boolean;
}>();

const router = useRouter();

const handleEdit = () => emit("edit", props.project.id);
const handleOpen = () => router.push({ name: "project", params: { id: props.project.id } });
</script>

<template>
	<base-card interactive class="project-card" @click="handleOpen">
		<div class="project-card__head">
			<strong class="project-card__name" :title="project.name">{{ project.name }}</strong>
			<span class="project-card__status">
				<span class="project-card__dot" :style="{ background: projectStatusDot[project.status] }" />
				{{ projectStatusLabel(project.status) }}
			</span>
		</div>
		<p class="project-card__description" :class="{ 'project-card__description--empty': !project.description }">
			{{ project.description || translate("project.noDescription") }}
		</p>
		<div class="project-card__footer">
			<base-user-name class="project-card__owner" :user="project.owner" />
			<base-flex align="center" :gap="2">
				<span class="project-card__tasks">{{ project.tasksCount }} {{ translate("project.tasks") }}</span>
				<base-icon-button v-if="editable" :label="translate('common.edit')" @click="handleEdit">
					<el-icon :size="16"><edit /></el-icon>
				</base-icon-button>
			</base-flex>
		</div>
	</base-card>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.project-card {
	display: flex;
	flex-direction: column;
	gap: map.get($spacers, 3);
	box-sizing: border-box;
	height: 100%;
	min-height: 172px;
	padding: map.get($spacers, 5);

	&__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: map.get($spacers, 3);
		min-width: 0;
	}

	&__name {
		overflow: hidden;
		font-size: map.get($font-sizes, 5);
		font-weight: 650;
		letter-spacing: -0.01em;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: map.get($spacers, 3);
		min-width: 0;
		margin-top: auto;
		padding-top: map.get($spacers, 3);
		border-top: 1px solid var(--mt-color-gray-100);
	}

	&__owner {
		min-width: 0;

		:deep(.base-user-name__label) {
			overflow: hidden;
			font-size: map.get($font-sizes, 6);
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	&__dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	&__status {
		display: inline-flex;
		align-items: center;
		gap: map.get($spacers, 2);
		padding: 2px map.get($spacers, 3);
		border-radius: 99px;
		background: var(--mt-color-gray-50);
		color: var(--mt-color-gray-600);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
		white-space: nowrap;
		flex-shrink: 0;
	}

	&__tasks {
		white-space: nowrap;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}

	&__description {
		display: -webkit-box;
		min-height: 2.8em;
		margin: 0;
		overflow: hidden;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;

		&--empty {
			color: var(--mt-color-gray-300);
		}
	}
}
</style>
