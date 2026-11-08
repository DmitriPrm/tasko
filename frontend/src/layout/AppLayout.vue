<script lang="ts" setup>
import { onUnmounted, watch } from "vue";

import AppHeader from "@/layout/components/AppHeader.vue";
import AppSidebar from "@/layout/components/AppSidebar.vue";
import EmailVerifyBanner from "@/layout/components/EmailVerifyBanner.vue";
import TaskDrawer from "@/pages/tasks/components/TaskDrawer.vue";
import { useLayoutStore } from "@/store/layout";
import { useTaskDrawerStore } from "@/store/taskDrawer";

const layoutStore = useLayoutStore();
const taskDrawerStore = useTaskDrawerStore();

const handleTaskChanged = () => taskDrawerStore.markChanged();

const handleCloseMobile = () => layoutStore.closeMobile();

watch(
	() => layoutStore.isMobileOpen,
	(isOpen) => {
		document.body.style.overflow = isOpen ? "hidden" : "";
	},
);

onUnmounted(() => {
	document.body.style.overflow = "";
});
</script>

<template>
	<base-flex
		class="app-layout"
		width="full"
		:class="{
			'app-layout--collapsed': !layoutStore.isMobile && layoutStore.isCollapsed,
			'app-layout--mobile': layoutStore.isMobile,
		}"
	>
		<app-sidebar />
		<button
			v-if="layoutStore.isMobile && layoutStore.isMobileOpen"
			class="app-layout__scrim"
			type="button"
			@click="handleCloseMobile"
		/>
		<main class="app-layout__content">
			<app-header />
			<email-verify-banner />
			<router-view />
		</main>
		<task-drawer v-model:task-id="taskDrawerStore.taskId" @updated="handleTaskChanged" @deleted="handleTaskChanged" />
	</base-flex>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.app-layout {
	min-height: 100vh;

	&__content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 100vh;
		padding: 0 map.get($spacers, 10) map.get($spacers, 10);
	}

	&__scrim {
		position: fixed;
		inset: 0;
		z-index: 2500;
		border: 0;
		background: var(--mt-color-scrim);
		backdrop-filter: blur(2px);
	}

	@media (max-width: 768px) {
		&__content {
			padding: 0 map.get($spacers, 4) map.get($spacers, 6);
		}
	}

	&__content:has(:global(.project-page--board)) {
		padding-bottom: 0;
	}
}
</style>
