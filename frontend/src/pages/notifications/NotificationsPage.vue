<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { baseApi } from "@/shared/api/baseApi";
import type { Notification } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { formatDateTime } from "@/shared/lib/helpers/formatDate";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BasePage from "@/shared/ui/page/BasePage.vue";
import { useTaskDrawerStore } from "@/store/taskDrawer";

const router = useRouter();
const taskDrawer = useTaskDrawerStore();

const PAGE_SIZES = [10, 20, 50];
const page = ref(1);
const perPage = ref(20);
const unreadOnly = ref(false);

const { state, isLoading, fetch } = useFetch(baseApi.notifications.getNotifications, "data", {
	immediate: true,
	params: computed(() => ({ page: page.value, perPage: perPage.value, unreadOnly: unreadOnly.value || undefined })),
});

const items = computed(() => (state.value?.items ?? []) as Notification[]);
const total = computed(() => state.value?.total ?? 0);

// Новый фильтр или размер страницы — начинаем с первой страницы
watch([unreadOnly, perPage], () => {
	page.value = 1;
});

const handleReadAll = async () => {
	await baseApi.notifications.markAllNotificationsRead();
	await fetch();
};

const handleOpen = async (item: Notification) => {
	if (!item.isRead) {
		await baseApi.notifications.markNotificationRead({ id: item.id });
		item.isRead = true;
	}
	if (item.type === "PROJECT_INVITATION") {
		await router.push({ name: "invitations" });
		return;
	}
	if (item.relatedTaskId) taskDrawer.open(item.relatedTaskId);
};
</script>

<template>
	<base-page :title="translate('notifications.title')">
		<template #actions>
			<base-button @click="handleReadAll">{{ translate("notifications.markAll") }}</base-button>
		</template>

		<base-flex class="notifications-page__toolbar" align="center" justify="space-between" :gap="3" wrap="wrap">
			<el-segmented
				v-model="unreadOnly"
				:options="[
					{ value: false, label: translate('notifications.all') },
					{ value: true, label: translate('notifications.unread') },
				]"
			/>
		</base-flex>

		<el-skeleton :loading="isLoading && !state" :rows="5" animated>
			<el-empty
				v-if="!items.length"
				:description="translate(unreadOnly ? 'notifications.emptyUnread' : 'notifications.empty')"
			/>
			<ul v-else class="notifications-page__list">
				<li v-for="item in items" :key="item.id">
					<button
						type="button"
						class="notifications-page__item"
						:class="{ 'notifications-page__item--unread': !item.isRead }"
						@click="() => handleOpen(item)"
					>
						<span v-if="!item.isRead" class="notifications-page__dot" :aria-label="translate('notifications.unread')" />
						<span class="notifications-page__text">
							<strong>{{ item.title }}</strong>
							<span>{{ item.body }}</span>
						</span>
						<time class="notifications-page__time" :datetime="item.createdAt">{{
							formatDateTime(item.createdAt)
						}}</time>
					</button>
				</li>
			</ul>
		</el-skeleton>

		<base-flex v-if="total > PAGE_SIZES[0]" class="notifications-page__pager" justify="center">
			<el-pagination
				v-model:current-page="page"
				v-model:page-size="perPage"
				:total="total"
				:page-sizes="PAGE_SIZES"
				layout="total, prev, pager, next, sizes"
				background
			/>
		</base-flex>
	</base-page>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.notifications-page {
	&__toolbar {
		margin-bottom: map.get($spacers, 4);
	}

	&__total {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 7);
	}

	&__list {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 2);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	&__item {
		display: flex;
		align-items: flex-start;
		gap: map.get($spacers, 3);
		width: 100%;
		padding: map.get($spacers, 4);
		border: 1px solid var(--mt-color-gray-100);
		border-radius: var(--mt-radius);
		background: var(--mt-color-white);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: box-shadow 0.15s var(--mt-ease);

		&:hover {
			box-shadow: var(--mt-shadow-hover);
		}

		&--unread {
			border-color: var(--mt-color-primary-light);
			background: var(--mt-color-primary-light);
		}
	}

	&__dot {
		flex-shrink: 0;
		width: 8px;
		height: 8px;
		margin-top: 7px;
		border-radius: 50%;
		background: var(--mt-color-primary);
	}

	&__text {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: map.get($spacers, 1);
		min-width: 0;

		span {
			color: var(--mt-color-gray-500);
		}
	}

	&__time {
		flex-shrink: 0;
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 8);
		white-space: nowrap;
	}

	&__pager {
		margin-top: map.get($spacers, 5);

		:deep(.el-pagination__sizes .el-select) {
			width: 140px;
		}
	}
}
</style>
