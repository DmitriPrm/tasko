<script lang="ts" setup>
import { Bell, Menu as MenuIcon, SwitchButton } from "@/shared/ui/icon/icons";
import { onBeforeUnmount, onMounted } from "vue";
import { useRouter } from "vue-router";

import { baseApi } from "@/shared/api/baseApi";
import type { Notification } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";
import { useAuthStore } from "@/store/auth";
import { useLayoutStore } from "@/store/layout";
import { useTaskDrawerStore } from "@/store/taskDrawer";

const router = useRouter();
const authStore = useAuthStore();
const layoutStore = useLayoutStore();
const taskDrawer = useTaskDrawerStore();

const { state: notifications, fetch: fetchNotifications } = useFetch(baseApi.notifications.getNotifications, "data", {
	immediate: true,
});

const { state: unread, fetch: fetchUnread } = useFetch(baseApi.notifications.getUnreadCount, "data", {
	immediate: true,
});

const handleOpenNotification = async (item: Notification) => {
	if (!item.isRead) {
		await baseApi.notifications.markNotificationRead({ id: item.id });
		await Promise.all([fetchNotifications(), fetchUnread()]);
	}
	if (item.type === "PROJECT_INVITATION") {
		await router.push({ name: "invitations" });
		return;
	}
	if (item.relatedTaskId) taskDrawer.open(item.relatedTaskId);
};

const handleReadAll = async () => {
	await baseApi.notifications.markAllNotificationsRead();
	await Promise.all([fetchNotifications(), fetchUnread()]);
};

const handleLogout = () => {
	authStore.logout();
	router.push({ name: "sign-in" });
};

const handleToggleMenu = () => layoutStore.toggle();

const handleRefresh = () => Promise.all([fetchNotifications(), fetchUnread()]).catch(() => false);

let timer: number | undefined;

onMounted(() => {
	timer = window.setInterval(() => {
		if (!document.hidden) handleRefresh();
	}, 60_000);
});

onBeforeUnmount(() => window.clearInterval(timer));
</script>

<template>
	<header class="app-header">
		<base-flex align="center" :justify="layoutStore.isMobile ? 'space-between' : 'flex-end'" :gap="4" width="full">
			<base-button
				v-if="layoutStore.isMobile"
				class="app-header__menu"
				text
				:aria-label="translate('common.menu')"
				@click="handleToggleMenu"
			>
				<el-icon :size="20">
					<menu-icon />
				</el-icon>
			</base-button>
			<base-flex class="app-header__controls" align="center" :gap="3">
				<el-popover
					placement="bottom-end"
					:width="layoutStore.isMobile ? 280 : 380"
					trigger="click"
					@before-enter="handleRefresh"
				>
					<template #reference>
						<el-badge :value="unread?.count || 0" :hidden="!unread?.count">
							<base-button class="app-header__bell" text :aria-label="translate('nav.notifications')">
								<el-icon :size="20"><bell /></el-icon>
							</base-button>
						</el-badge>
					</template>
					<base-flex align="center" justify="space-between">
						<strong class="app-header__popover-title">{{ translate("notifications.title") }}</strong>
						<base-button text @click="handleReadAll">{{ translate("notifications.markAll") }}</base-button>
					</base-flex>
					<p v-if="!notifications?.length" class="app-header__empty">
						{{ translate("notifications.empty") }}
					</p>
					<div v-else class="app-header__notices">
						<button
							v-for="item in notifications || []"
							:key="item.id"
							class="app-header__notice"
							:class="{ 'app-header__notice--unread': !item.isRead }"
							@click="() => handleOpenNotification(item)"
						>
							<strong>{{ item.title }}</strong>
							<span>{{ item.body }}</span>
						</button>
					</div>
				</el-popover>
				<base-user-name v-if="authStore.user" class="app-header__user" :user="authStore.user" :size="32" />
				<base-button
					class="app-header__logout"
					text
					:aria-label="translate('nav.logout')"
					:title="translate('nav.logout')"
					@click="handleLogout"
				>
					<base-flex align="center" :gap="1">
						<el-icon :size="16"><switch-button /></el-icon>
						<span v-if="!layoutStore.isMobile">{{ translate("nav.logout") }}</span>
					</base-flex>
				</base-button>
			</base-flex>
		</base-flex>
	</header>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.app-header {
	position: sticky;
	top: 0;
	z-index: 1000;
	margin: 0 calc(-1 * map.get($spacers, 10)) map.get($spacers, 6);
	padding: map.get($spacers, 3) map.get($spacers, 10);
	background: var(--mt-color-header);
	backdrop-filter: saturate(160%) blur(14px);

	&__controls {
		flex-shrink: 0;
	}

	&__menu,
	&__bell {
		width: 38px;
		height: 38px;
		padding: 0;
		border-radius: var(--mt-radius-sm);
		color: var(--mt-color-gray-500);

		&:hover,
		&:focus {
			background: var(--mt-color-gray-100);
			color: var(--mt-color-text);
		}
	}

	&__user {
		padding: map.get($spacers, 1) map.get($spacers, 3) map.get($spacers, 1) map.get($spacers, 1);
		border: 1px solid var(--mt-color-gray-100);
		border-radius: 99px;
		background: var(--mt-color-white);
		font-size: map.get($font-sizes, 6);
		font-weight: 500;
		box-shadow: var(--mt-shadow);
	}

	&__logout {
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
		font-weight: 500;
		--el-button-text-color: var(--mt-color-gray-500);
		--el-button-hover-text-color: var(--mt-color-text);

		&:hover,
		&:focus {
			color: var(--mt-color-text);
		}
	}

	&__popover-title {
		font-size: map.get($font-sizes, 5);
		letter-spacing: -0.01em;
	}

	@media (max-width: 768px) {
		margin: 0 calc(-1 * map.get($spacers, 4)) map.get($spacers, 4);
		padding: map.get($spacers, 2) map.get($spacers, 4);

		&__user {
			padding: map.get($spacers, 1);
		}

		&__user :deep(span:not(.base-avatar)) {
			display: none;
		}
	}

	&__empty {
		margin: map.get($spacers, 4) 0 0;
		color: var(--mt-color-gray-500);
		text-align: center;
	}

	&__notices {
		max-height: var(--mt-popup-max-height);
		margin-top: map.get($spacers, 2);
		overflow-y: auto;
	}

	&__notice {
		display: block;
		width: 100%;
		margin-top: map.get($spacers, 2);
		padding: map.get($spacers, 3) map.get($spacers, 4);
		border: 1px solid transparent;
		border-radius: var(--mt-radius-sm);
		background: var(--mt-color-gray-50);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition:
			background 0.18s var(--mt-ease),
			border-color 0.18s var(--mt-ease);

		&:hover {
			border-color: var(--mt-color-gray-200);
			background: var(--mt-color-white);
		}

		span {
			display: block;
			margin-top: map.get($spacers, 1);
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 8);
		}

		&--unread {
			border-color: var(--mt-color-primary-light);
			background: var(--mt-color-primary-light);
		}
	}
}
</style>
