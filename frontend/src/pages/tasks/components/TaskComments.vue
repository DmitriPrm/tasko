<script lang="ts" setup>
import { computed, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { formatDateTime } from "@/shared/lib/helpers/formatDate";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";
import { useAuthStore } from "@/store/auth";

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
</script>

<template>
	<section class="task-comments">
		<h3>{{ translate("task.comments") }}</h3>
		<base-flex direction="column" :gap="4">
			<article v-for="comment in state || []" :key="comment.id" class="task-comments__item">
				<base-flex direction="column" :gap="1">
					<base-flex align="center" :gap="2" wrap="wrap">
						<base-user-name :user="comment.author" :size="28" />
						<span class="task-comments__date">{{ formatDateTime(comment.createdAt) }}</span>
					</base-flex>
					<p>{{ comment.body }}</p>
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

	&__item p {
		margin: 0;
		font-size: map.get($font-sizes, 6);
	}

	&__date {
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 8);
	}

	&__composer {
		margin-top: map.get($spacers, 4);
	}
}
</style>
