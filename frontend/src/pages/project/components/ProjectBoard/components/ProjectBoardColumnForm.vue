<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const MAX_LENGTH = 255;
const COLOR_PRESETS = [
	"#2563EB",
	"#0EA5E9",
	"#10B981",
	"#84CC16",
	"#F59E0B",
	"#EF4444",
	"#EC4899",
	"#7C3AED",
	"#6B7280",
];

const emit = defineEmits<{
	submit: [payload: { name: string; color: string }];
	cancel: [];
}>();

const props = defineProps<{
	name: string;
	color: string;
	placeholder: string;
	hint: string;
	submitLabel: string;
}>();

const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const draftName = ref(props.name);
const draftColor = ref(props.color);

const handleSubmit = () => {
	const name = draftName.value.trim();
	if (!name) return;
	emit("submit", { name, color: draftColor.value || props.color });
};

const handleKeydown = (event: KeyboardEvent) => {
	if (event.isComposing) return;
	if (event.key === "Enter") {
		event.preventDefault();
		handleSubmit();
	} else if (event.key === "Escape") {
		event.preventDefault();
		emit("cancel");
	}
};

// Клик вне формы отменяет изменения; выбор цвета (попап в body) не считается
const handlePointerDown = (event: MouseEvent) => {
	const target = event.target as HTMLElement | null;
	if (!target || root.value?.contains(target)) return;
	if (target.closest(".el-color-picker__panel, .el-popper")) return;
	emit("cancel");
};

// Фокус в поле с курсором в конце названия (без выделения текста)
const focusInput = () => {
	const element = input.value;
	if (!element) return;
	element.focus();
	const end = element.value.length;
	element.setSelectionRange(end, end);
};

onMounted(() => {
	document.addEventListener("mousedown", handlePointerDown, true);
	focusInput();
	// Выпадающее меню после закрытия возвращает фокус на кнопку «⋯» - забираем его обратно
	window.setTimeout(() => {
		if (document.activeElement !== input.value) focusInput();
	}, 150);
});

onBeforeUnmount(() => document.removeEventListener("mousedown", handlePointerDown, true));
</script>

<template>
	<div ref="root" class="board-column-form">
		<div class="board-column-form__row">
			<input
				ref="input"
				v-model="draftName"
				class="board-column-form__input"
				type="text"
				:maxlength="MAX_LENGTH"
				:placeholder="placeholder"
				@keydown="handleKeydown"
			/>
			<span class="board-column-form__counter">{{ draftName.length }}/{{ MAX_LENGTH }}</span>
			<span class="board-column-form__color">
				<el-color-picker v-model="draftColor" :predefine="COLOR_PRESETS" :show-alpha="false" />
			</span>
		</div>
		<div class="board-column-form__footer">
			<p class="board-column-form__hint">{{ hint }}</p>
			<base-button type="primary" size="small" :disabled="!draftName.trim()" @click="handleSubmit">
				{{ submitLabel }}
			</base-button>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.board-column-form {
	padding: map.get($spacers, 2) map.get($spacers, 3) 0;
	border: 1px solid var(--mt-color-primary);
	border-radius: var(--mt-radius);
	background: var(--mt-color-white);

	&__row {
		display: flex;
		align-items: center;
		gap: map.get($spacers, 2);
	}

	&__input {
		flex: 1;
		min-width: 0;
		padding: map.get($spacers, 1) 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--mt-color-text);
		font: inherit;
		font-size: map.get($font-sizes, 6);
		font-weight: 600;
	}

	&__counter {
		flex-shrink: 0;
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 8);
	}

	&__footer {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: map.get($spacers, 2);
		margin-top: map.get($spacers, 2);
		padding: map.get($spacers, 2) 0;
		border-top: 1px solid var(--mt-color-gray-100);
	}

	&__hint {
		flex: 1 1 100%;
		min-width: 0;
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}

	// Цветной квадрат без рамки и стрелки: весь триггер залит выбранным цветом
	&__color {
		flex-shrink: 0;
		height: 24px;

		:deep(.el-color-picker__trigger) {
			width: 24px;
			height: 24px;
			padding: 0;
			border: 0;
			border-radius: 6px;
			overflow: hidden;
		}

		:deep(.el-color-picker__color) {
			border: 0;
			border-radius: 6px;
		}

		:deep(.el-color-picker__icon),
		:deep(.el-color-picker__color-inner .el-icon),
		:deep(.el-color-picker__color-inner svg) {
			display: none !important;
		}
	}
}
</style>

<style lang="scss">
/* Без scoped: внутренности el-color-picker не получают scoped-атрибут */
.board-column-form__color .el-color-picker__icon,
.board-column-form__color .el-color-picker__color-inner .el-icon,
.board-column-form__color .el-color-picker__color-inner svg {
	display: none !important;
}

.board-column-form__color .el-color-picker__trigger {
	width: 24px;
	height: 24px;
	padding: 0;
	border: 0;
	border-radius: 6px;
	overflow: hidden;
}

.board-column-form__color .el-color-picker__color {
	border: 0;
	border-radius: 6px;
}
</style>
