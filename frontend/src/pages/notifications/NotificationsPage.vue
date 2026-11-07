<script lang="ts" setup>
import { baseApi } from "@/shared/api/baseApi";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BasePage from "@/shared/ui/page/BasePage.vue";
import { useTaskDrawerStore } from "@/store/taskDrawer";

const taskDrawer = useTaskDrawerStore();
const { state, isLoading, fetch } = useFetch(baseApi.notifications.getNotifications, "data", {
	immediate: true,
});

const handleReadAll = async () => {
	await baseApi.notifications.markAllNotificationsRead();
	await fetch();
};

const handleOpen = async (id: string, taskId: string | null, isRead: boolean) => {
	if (!isRead) {
		await baseApi.notifications.markNotificationRead({ id });
	}
	if (taskId) taskDrawer.open(taskId);
};
</script>

<template>
	<base-page :title="translate('notifications.title')">
		<template #actions>
			<el-button @click="handleReadAll">{{ translate("notifications.markAll") }}</el-button>
		</template>
		<el-empty v-if="!isLoading && !state?.length" :description="translate('notifications.empty')" />
		<article
			v-for="item in state || []"
			:key="item.id"
			class="notifications-page__item"
			:class="{ 'notifications-page__item--unread': !item.isRead }"
			@click="() => handleOpen(item.id, item.relatedTaskId, item.isRead)"
		>
			<strong>{{ item.title }}</strong>
			<p>{{ item.body }}</p>
		</article>
	</base-page>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.notifications-page {
	&__item {
		margin-bottom: map.get($spacers, 3);
		padding: map.get($spacers, 4);
		background: var(--mt-color-white);
		border-radius: var(--mt-radius);
		cursor: pointer;

		&--unread {
			background: var(--mt-color-primary-light);
		}

		p {
			margin: map.get($spacers, 2) 0 0;
			color: var(--mt-color-gray-500);
		}
	}
}
</style>
