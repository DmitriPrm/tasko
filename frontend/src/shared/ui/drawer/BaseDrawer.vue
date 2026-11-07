<script lang="ts" setup>
import { Close } from "@/shared/ui/icon/icons";
import { onBeforeUnmount, useSlots, watch } from "vue";

import { translate } from "@/shared/lib/theming/i18n/translate";

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	close: [];
}>();

const props = withDefaults(
	defineProps<{
		modelValue: boolean;
		title?: string;
		width?: string;
		closable?: boolean;
	}>(),
	{
		width: "440px",
		closable: true,
	},
);

const slots = useSlots();

const handleClose = () => {
	if (!props.closable) return;
	emit("update:modelValue", false);
	emit("close");
};

const handleKeydown = (event: KeyboardEvent) => {
	if (event.key === "Escape") handleClose();
};

watch(
	() => props.modelValue,
	(isOpen) => {
		if (isOpen) {
			window.addEventListener("keydown", handleKeydown);
			return;
		}
		window.removeEventListener("keydown", handleKeydown);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
	<teleport to="body">
		<transition name="fade">
			<div v-if="modelValue" class="base-drawer__backdrop" @click="handleClose" />
		</transition>
		<transition name="base-drawer">
			<aside v-if="modelValue" class="base-drawer" :style="{ width }">
				<base-flex class="base-drawer__panel" direction="column" height="full">
					<base-flex class="base-drawer__header" align="center" justify="space-between" :gap="3">
						<slot name="header">
							<h3 class="base-drawer__title">{{ title }}</h3>
						</slot>
						<base-button
							v-if="closable"
							class="base-drawer__close"
							text
							:aria-label="translate('common.close')"
							@click="handleClose"
						>
							<el-icon :size="18"><close /></el-icon>
						</base-button>
					</base-flex>
					<div class="base-drawer__body">
						<slot />
					</div>
					<div v-if="slots.footer" class="base-drawer__footer">
						<slot name="footer" />
					</div>
				</base-flex>
			</aside>
		</transition>
	</teleport>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.base-drawer {
	position: fixed;
	top: 0;
	right: 0;
	z-index: 2001;
	height: 100vh;
	border-left: 1px solid var(--mt-color-gray-100);
	border-radius: var(--mt-radius-lg) 0 0 var(--mt-radius-lg);
	background: var(--mt-color-white);
	box-shadow: var(--mt-shadow-pop);

	@media (max-width: 768px) {
		width: 100% !important;
		border-radius: 0;
	}

	&__backdrop {
		position: fixed;
		inset: 0;
		z-index: 2000;
		background: var(--mt-color-scrim);
		backdrop-filter: blur(2px);
	}

	&__panel {
		height: 100%;
		min-height: 0;
	}

	&__header {
		padding: map.get($spacers, 6) map.get($spacers, 6) map.get($spacers, 4);
	}

	&__title {
		margin: 0;
		font-size: map.get($font-sizes, 4);
		font-weight: 650;
	}

	&__close {
		margin-left: auto;
		color: var(--mt-color-gray-400);
	}

	&__body {
		flex: 1;
		min-height: 0;
		padding: 0 map.get($spacers, 6) map.get($spacers, 6);
		overflow-y: auto;
	}

	&__footer {
		padding: map.get($spacers, 4) map.get($spacers, 6) map.get($spacers, 6);
		border-top: 1px solid var(--mt-color-gray-100);
	}
}

.base-drawer-enter-active,
.base-drawer-leave-active {
	transition: transform 0.3s var(--mt-ease);
}

.base-drawer-enter-from,
.base-drawer-leave-to {
	transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
