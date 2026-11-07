<script lang="ts" setup>
import { computed } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { TaskHistory } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { formatDate, formatDateTime } from "@/shared/lib/helpers/formatDate";
import { priorityLabel, statusLabel, typeLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";

const props = defineProps<{
	taskId: string;
}>();

const { state } = useFetch(baseApi.tasks.getTaskHistory, "data", {
	immediate: true,
	pathParams: computed(() => ({ id: props.taskId })),
});

type Actor = { id: string; fullName: string };
type Entry = { id: string; changedAt: string; actor: Actor; label: string; from: string; to: string };

const EMPTY = "—";

/** Значение поля в человеческом виде; длинные тексты не выводим целиком */
const formatValue = (field: string, value: string | null) => {
	if (value == null || value === "") return EMPTY;
	if (field === "deadlineAt" || field === "plannedStartAt") return formatDate(value);
	if (field === "priority") return priorityLabel(value);
	if (field === "type") return typeLabel(value);
	if (field === "isCompleted") return value === "true" ? translate("task.completed") : translate("task.notCompleted");
	return value;
};

const history = computed(() => state.value as TaskHistory | null | undefined);

const entries = computed<Entry[]>(() => {
	const statuses: Entry[] = (history.value?.statusHistory ?? []).map((item) => ({
		id: item.id,
		changedAt: item.changedAt,
		actor: item.actor,
		label: translate("task.status"),
		from: item.fromStatus ? statusLabel(item.fromStatus) : EMPTY,
		to: statusLabel(item.toStatus),
	}));
	const fields: Entry[] = (history.value?.changeHistory ?? []).map((item) => {
		const isText = item.fieldName === "description";
		return {
			id: item.id,
			changedAt: item.changedAt,
			actor: item.actor,
			label: translate(`task.field.${item.fieldName}`),
			from: isText ? "" : formatValue(item.fieldName, item.oldValue),
			to: isText ? "" : formatValue(item.fieldName, item.newValue),
		};
	});
	return [...statuses, ...fields].sort((a, b) => b.changedAt.localeCompare(a.changedAt));
});
</script>

<template>
	<section class="task-history">
		<h3>{{ translate("task.history") }}</h3>
		<base-flex direction="column" :gap="3">
			<div v-for="item in entries" :key="item.id" class="task-history__item">
				<base-flex align="center" wrap="wrap" :gap="2">
					<base-user-name :user="item.actor" />
					<span class="task-history__field">{{ item.label }}:</span>
					<span v-if="item.from || item.to">{{ item.from }} → {{ item.to }}</span>
				</base-flex>
				<span class="task-history__date">{{ formatDateTime(item.changedAt) }}</span>
			</div>
		</base-flex>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.task-history {
	h3 {
		margin: 0 0 map.get($spacers, 4);
		font-size: map.get($font-sizes, 6);
		font-weight: 600;
	}

	&__item {
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
	}

	&__field {
		color: var(--mt-color-text);
		font-weight: 500;
	}

	&__date {
		display: block;
		margin-top: map.get($spacers, 1);
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 8);
	}
}
</style>
