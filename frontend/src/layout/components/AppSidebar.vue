<script lang="ts" setup>
import { CircleCheck, Close, Expand, Fold, Folder, Grid, PieChart, Setting, Star, User } from "@/shared/ui/icon/icons";
import { computed, onMounted, watch, type Component } from "vue";
import { useRoute } from "vue-router";

import { SETTINGS_CATEGORIES } from "@/pages/settings/settingsCategories";
import BaseLogo from "@/shared/ui/logo/BaseLogo.vue";
import { translate } from "@/shared/lib/theming/i18n/translate";
import { useAuthStore } from "@/store/auth";
import { useFavoritesStore } from "@/store/favorites";
import { useLayoutStore } from "@/store/layout";
import { useLocaleStore } from "@/store/locale";

const route = useRoute();
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const layoutStore = useLayoutStore();
const localeStore = useLocaleStore();

const items = computed(() => {
	void localeStore.locale; // пересчитать при смене языка
	const list: { name: string; label: string; icon: Component }[] = [
		{ name: "dashboard", label: translate("nav.dashboard"), icon: Grid },
		{ name: "tasks", label: translate("nav.tasks"), icon: CircleCheck },
		{ name: "projects", label: translate("nav.projects"), icon: Folder },
	];

	if (authStore.hasPermission("ANALYTICS_VIEW")) {
		list.push({ name: "analytics", label: translate("nav.analytics"), icon: PieChart });
	}

	if (authStore.hasPermission("SETTINGS_GENERAL") || authStore.hasPermission("SETTINGS_PERMISSIONS")) {
		list.push({ name: "settings", label: translate("nav.settings"), icon: Setting });
	}

	if (authStore.hasPermission("USERS_VIEW")) {
		list.push({ name: "users", label: translate("nav.users"), icon: User });
	}

	return list;
});

const isCollapsedDesktop = computed(() => !layoutStore.isMobile && layoutStore.isCollapsed);

watch(
	() => route.fullPath,
	() => layoutStore.closeMobile(),
);

onMounted(() => {
	favoritesStore.load();
});

const isItemActive = (name: string) => {
	if (name === "projects") return route.name === "projects" || route.name === "project";
	if (name === "tasks") return route.name === "tasks";
	if (name === "settings") {
		return route.name === "settings" || SETTINGS_CATEGORIES.some((item) => item.routeName === route.name);
	}
	return route.name === name;
};

const handleCloseMobile = () => layoutStore.closeMobile();
const handleToggleDesktop = () => layoutStore.toggle();
</script>

<template>
	<aside
		class="app-sidebar"
		:class="{
			'app-sidebar--collapsed': isCollapsedDesktop,
			'app-sidebar--mobile': layoutStore.isMobile,
			'app-sidebar--open': layoutStore.isMobile && layoutStore.isMobileOpen,
		}"
	>
		<div class="app-sidebar__top">
			<router-link :to="{ name: 'dashboard' }" class="app-sidebar__brand">
				<base-logo class="app-sidebar__logo" :size="36" />
				<span class="app-sidebar__brand-text">
					<strong>{{ translate("app.name") }}</strong>
					<small>{{ translate("app.subtitle") }}</small>
				</span>
			</router-link>
			<base-button
				v-if="layoutStore.isMobile"
				class="app-sidebar__close"
				text
				:aria-label="translate('common.close')"
				@click="handleCloseMobile"
			>
				<el-icon :size="20"><close /></el-icon>
			</base-button>
		</div>

		<nav class="app-sidebar__nav" :aria-label="translate('app.name')">
			<el-tooltip
				v-for="item in items"
				:key="item.name"
				placement="right"
				:content="item.label"
				:disabled="!isCollapsedDesktop"
				:show-after="120"
			>
				<router-link
					:to="{ name: item.name }"
					class="app-sidebar__link"
					:class="{ 'app-sidebar__link--active': isItemActive(item.name) }"
				>
					<el-icon class="app-sidebar__icon" :size="20" aria-hidden="true">
						<component :is="item.icon" />
					</el-icon>
					<span class="app-sidebar__label">{{ item.label }}</span>
				</router-link>
			</el-tooltip>

			<section v-if="favoritesStore.hasFavorites" class="app-sidebar__favorites">
				<strong class="app-sidebar__section-title">{{ translate("nav.favorites") }}</strong>
				<el-tooltip
					v-for="project in favoritesStore.items"
					:key="project.id"
					placement="right"
					:content="project.name"
					:disabled="!isCollapsedDesktop"
					:show-after="120"
				>
					<router-link
						:to="{ name: 'project', params: { id: project.id } }"
						class="app-sidebar__link"
						:class="{ 'app-sidebar__link--active': route.params.id === project.id }"
					>
						<span v-if="isCollapsedDesktop" class="app-sidebar__initial" aria-hidden="true">
							{{ project.name.trim().charAt(0).toUpperCase() }}
						</span>
						<el-icon v-else class="app-sidebar__icon" :size="20" aria-hidden="true"><star /></el-icon>
						<span class="app-sidebar__label">{{ project.name }}</span>
					</router-link>
				</el-tooltip>
			</section>
		</nav>

		<el-tooltip
			v-if="!layoutStore.isMobile"
			placement="right"
			:content="translate('nav.expand')"
			:disabled="!isCollapsedDesktop"
			:show-after="120"
		>
			<button class="app-sidebar__collapse" type="button" @click="handleToggleDesktop">
				<el-icon class="app-sidebar__icon" :size="20" aria-hidden="true">
					<expand v-if="isCollapsedDesktop" />
					<fold v-else />
				</el-icon>
				<span class="app-sidebar__label">{{ translate("nav.collapse") }}</span>
			</button>
		</el-tooltip>
	</aside>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

$expanded: 256px;
$collapsed: 76px;

.app-sidebar {
	--sidebar-pad: #{map.get($spacers, 4)};

	position: sticky;
	top: 0;
	display: flex;
	flex-shrink: 0;
	flex-direction: column;
	align-self: flex-start;
	box-sizing: border-box;
	width: $expanded;
	height: 100vh;
	padding: map.get($spacers, 5) var(--sidebar-pad);
	overflow: hidden;
	background: var(--mt-color-sidebar);
	color: var(--mt-color-sidebar-text);
	border-right: 1px solid var(--mt-color-gray-100);
	transition:
		width 0.28s var(--mt-ease),
		padding 0.28s var(--mt-ease),
		transform 0.25s var(--mt-ease);

	&--collapsed {
		--sidebar-pad: #{map.get($spacers, 3)};

		width: $collapsed;
	}

	&--mobile {
		position: fixed;
		inset: 0 auto 0 0;
		z-index: 3000;
		width: min(320px, 86vw);
		height: 100dvh;
		transform: translateX(-100%);
		box-shadow: var(--mt-shadow-pop);
	}

	&--open {
		transform: translateX(0);
	}

	&__top {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: space-between;
		gap: map.get($spacers, 3);
		min-height: 40px;
		margin-bottom: map.get($spacers, 8);
		padding: 0 map.get($spacers, 2);
	}

	&--collapsed &__top {
		justify-content: center;
		padding: 0;
	}

	&__brand {
		display: flex;
		align-items: center;
		gap: map.get($spacers, 3);
		min-width: 0;
		color: var(--mt-color-text);
	}

	&__logo {
		flex-shrink: 0;
		border-radius: 11px;
		box-shadow: 0 6px 14px -4px rgba(79, 86, 232, 0.6);
	}

	&__brand-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		white-space: nowrap;
		transition: opacity 0.2s var(--mt-ease);

		strong {
			font-size: map.get($font-sizes, 4);
			font-weight: 700;
			letter-spacing: -0.02em;
		}

		small {
			color: var(--mt-color-gray-400);
			font-size: map.get($font-sizes, 8);
		}
	}

	&--collapsed &__brand-text {
		position: absolute;
		width: 0;
		opacity: 0;
		pointer-events: none;
	}

	&__close {
		color: var(--mt-color-gray-400);
	}

	&__nav {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: map.get($spacers, 2);
		min-height: 0;
		margin: 0 calc(var(--sidebar-pad) * -1);
		padding: 0 var(--sidebar-pad);
		overflow-x: hidden;
		overflow-y: auto;
		scrollbar-width: thin;
	}

	&__link,
	&__collapse {
		position: relative;
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: map.get($spacers, 3);
		box-sizing: border-box;
		min-height: 44px;
		padding: 0 map.get($spacers, 3);
		border: 0;
		border-radius: var(--mt-radius-sm);
		background: transparent;
		color: var(--mt-color-sidebar-text);
		font: inherit;
		font-size: map.get($font-sizes, 6);
		font-weight: 500;
		text-align: left;
		cursor: pointer;
		transition:
			background 0.18s var(--mt-ease),
			color 0.18s var(--mt-ease);

		&:hover {
			background: var(--mt-color-gray-50);
			color: var(--mt-color-text);
		}
	}

	&--collapsed &__link,
	&--collapsed &__collapse {
		justify-content: center;
		padding: 0;
	}

	&--mobile &__link {
		min-height: 52px;
		font-size: map.get($font-sizes, 5);
	}

	&__link--active,
	&__link--active:hover {
		background: var(--mt-color-sidebar-active);
		color: var(--mt-color-sidebar-active-text);
		font-weight: 600;

		&::before {
			content: "";
			position: absolute;
			top: 22%;
			bottom: 22%;
			left: calc(var(--sidebar-pad) * -1);
			width: 4px;
			border-radius: 0 4px 4px 0;
			background: var(--mt-gradient-brand);
		}
	}

	&__icon {
		flex-shrink: 0;
		color: inherit;
	}

	&__label {
		overflow: hidden;
		max-width: 200px;
		text-overflow: ellipsis;
		white-space: nowrap;
		transition:
			opacity 0.2s var(--mt-ease),
			max-width 0.28s var(--mt-ease);
	}

	&--collapsed &__label {
		max-width: 0;
		opacity: 0;
	}

	&__initial {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		background: var(--mt-color-gray-100);
		color: var(--mt-color-text);
		font-size: map.get($font-sizes, 7);
		font-weight: 700;
	}

	&__favorites {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 2);
		margin-top: map.get($spacers, 5);
		padding-top: map.get($spacers, 5);
		border-top: 1px solid var(--mt-color-gray-100);
	}

	&__section-title {
		overflow: hidden;
		max-height: 20px;
		margin-bottom: map.get($spacers, 1);
		padding: 0 map.get($spacers, 3);
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		white-space: nowrap;
		transition:
			opacity 0.2s var(--mt-ease),
			max-height 0.28s var(--mt-ease);
	}

	&--collapsed &__section-title {
		max-height: 0;
		margin: 0;
		opacity: 0;
	}

	&__collapse {
		flex-shrink: 0;
		width: 100%;
		margin-top: map.get($spacers, 3);
		border-top: 1px solid var(--mt-color-gray-100);
		border-radius: var(--mt-radius-sm);
		color: var(--mt-color-gray-500);
	}
}
</style>
