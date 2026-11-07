<script lang="ts" setup>
import { computed } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { formatDateTime } from "@/shared/lib/helpers/formatDate";
import { statusLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";

const props = defineProps<{
	taskId: string;
}>();

const { state } = useFetch(baseApi.tasks.getTaskHistory, "data", {
	immediate: true,
	pathParams: computed(() => ({ id: props.taskId })),
});
</script>

<template>
	<section class="task-history">
		<h3>{{ translate("task.history") }}</h3>
		<base-flex direction="column" :gap="3">
			<base-flex
				v-for="item in state?.statusHistory || []"
				:key="item.id"
				class="task-history__item"
				align="center"
				wrap="wrap"
				:gap="2"
			>
				<base-user-name :user="item.actor" />
				{{ item.fromStatus ? statusLabel(item.fromStatus) : "—" }} → {{ statusLabel(item.toStatus) }}
				<span>{{ formatDateTime(item.changedAt) }}</span>
			</base-flex>
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

		span {
			display: block;
			margin-top: map.get($spacers, 1);
			color: var(--mt-color-gray-400);
			font-size: map.get($font-sizes, 8);
		}
	}
}
</style>
