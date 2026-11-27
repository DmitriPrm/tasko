<script lang="ts" setup>
import { InfoFilled } from "@/shared/ui/icon/icons";

/**
 * Круглая иконка «i» с подсказкой. Текст — через content или слот #content (для разметки).
 * Иконка — это кнопка, поэтому подсказку можно открыть и с клавиатуры.
 */
withDefaults(
	defineProps<{
		content?: string;
		/** Подпись для программ чтения с экрана */
		label?: string;
		placement?: "top" | "bottom" | "left" | "right";
		size?: number;
		maxWidth?: number;
	}>(),
	{ content: "", label: "", placement: "top", size: 15, maxWidth: 280 },
);
</script>

<template>
	<el-tooltip :placement="placement" :show-after="100" popper-class="base-tooltip">
		<button class="base-tooltip__trigger" type="button" :aria-label="label || content" @click.stop>
			<el-icon :size="size" aria-hidden="true"><info-filled /></el-icon>
		</button>
		<template #content>
			<div class="base-tooltip__content" :style="{ maxWidth: `${maxWidth}px` }">
				<slot name="content">{{ content }}</slot>
			</div>
		</template>
	</el-tooltip>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.base-tooltip__trigger {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: var(--mt-color-gray-400);
	cursor: help;
	transition: color 0.15s var(--mt-ease);

	&:hover,
	&:focus-visible {
		color: var(--mt-color-primary);
	}

	&:focus-visible {
		outline: 2px solid var(--mt-color-primary-light);
		outline-offset: 2px;
	}
}

/* Содержимое подсказки рендерится в body */
:global(.base-tooltip__content) {
	font-size: map.get($font-sizes, 8);
	line-height: 1.45;
}

:global(.base-tooltip__content p) {
	margin: 0;
}

:global(.base-tooltip__content p + p) {
	margin-top: map.get($spacers, 1);
}
</style>
