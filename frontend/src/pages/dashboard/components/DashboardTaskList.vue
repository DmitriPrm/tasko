<script lang="ts" setup>
import dayjs from "dayjs";

import type { Task } from "@/shared/api/v0/schemas";
import { priorityLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import { useTaskDrawerStore } from "@/store/taskDrawer";

interface Props {
	title: string;
	tasks: Task[];
	deadlines?: boolean;
}

defineProps<Props>();

const taskDrawer = useTaskDrawerStore();

const formatListDate = (value?: string | null) => (value ? dayjs(value).format("DD.MM.YYYY") : "");

const handleOpen = (taskId: string) => {
	taskDrawer.open(taskId);
};
</script>

<template>
	<base-card class="dashboard-task-list">
		<h3>{{ title }}</h3>
		<p v-if="!tasks.length" class="dashboard-task-list__empty">{{ translate("common.empty") }}</p>
		<div v-for="task in tasks" :key="task.id" class="dashboard-task-list__item" @click="() => handleOpen(task.id)">
			<base-flex align="center" justify="space-between" :gap="4">
				<span class="dashboard-task-list__title">{{ task.title }}</span>
				<base-flex class="dashboard-task-list__meta" align="center" :gap="4">
					<span v-if="!deadlines">{{ priorityLabel(task.priority) }}</span>
					<span v-if="deadlines && task.plannedStartAt">{{ formatListDate(task.plannedStartAt) }}</span>
					<span v-if="task.deadlineAt">{{ formatListDate(task.deadlineAt) }}</span>
				</base-flex>
			</base-flex>
		</div>
	</base-card>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.dashboard-task-list {
	min-width: min(100%, 320px);
	flex: 1;
	padding: map.get($spacers, 5) map.get($spacers, 6);

	h3 {
		margin: 0 0 map.get($spacers, 3);
		font-size: map.get($font-sizes, 4);
		font-weight: 650;
	}

	&__empty {
		margin: 0;
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 6);
	}

	&__item {
		margin: 0 calc(-1 * map.get($spacers, 3));
		padding: map.get($spacers, 3);
		border-radius: var(--mt-radius-sm);
		cursor: pointer;
		font-size: map.get($font-sizes, 6);
		transition: background 0.15s ease;

		&:hover {
			background: var(--mt-color-gray-50);
		}
	}

	&__title {
		flex: 1;
		min-width: 0;
		font-weight: 550;
	}

	&__meta {
		flex-shrink: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}
}
</style>
