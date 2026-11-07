<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";

import { translate } from "@/shared/lib/theming/i18n/translate";

const VIEW = 280;
const OUTPUT = 512;
const MAX_ZOOM = 4;

const props = defineProps<{
	modelValue: boolean;
	file: File | null;
	loading?: boolean;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	confirm: [blob: Blob];
}>();

const image = ref<HTMLImageElement | null>(null);
const objectUrl = ref("");
const zoom = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const isDragging = ref(false);
const isReady = ref(false);

let dragStart = { x: 0, y: 0, ox: 0, oy: 0 };

const baseScale = computed(() => {
	const img = image.value;
	if (!img) return 1;
	return Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight);
});
const scale = computed(() => baseScale.value * zoom.value);
const width = computed(() => (image.value ? image.value.naturalWidth * scale.value : VIEW));
const height = computed(() => (image.value ? image.value.naturalHeight * scale.value : VIEW));

const clamp = () => {
	offsetX.value = Math.min(0, Math.max(VIEW - width.value, offsetX.value));
	offsetY.value = Math.min(0, Math.max(VIEW - height.value, offsetY.value));
};

const reset = () => {
	zoom.value = 1;
	offsetX.value = (VIEW - width.value) / 2;
	offsetY.value = (VIEW - height.value) / 2;
	clamp();
};

const release = () => {
	if (objectUrl.value) URL.revokeObjectURL(objectUrl.value);
	objectUrl.value = "";
	image.value = null;
	isReady.value = false;
};

watch(
	() => [props.modelValue, props.file] as const,
	([visible, file]) => {
		release();
		if (!visible || !file) return;
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			image.value = img;
			reset();
			isReady.value = true;
		};
		img.onerror = () => emit("update:modelValue", false);
		img.src = url;
		objectUrl.value = url;
	},
	{ immediate: true },
);

// Масштабирование вокруг центра рамки
watch(zoom, (next, prev) => {
	if (!image.value) return;
	const centerX = (VIEW / 2 - offsetX.value) / (baseScale.value * prev);
	const centerY = (VIEW / 2 - offsetY.value) / (baseScale.value * prev);
	offsetX.value = VIEW / 2 - centerX * baseScale.value * next;
	offsetY.value = VIEW / 2 - centerY * baseScale.value * next;
	clamp();
});

const handlePointerDown = (event: PointerEvent) => {
	if (!isReady.value) return;
	isDragging.value = true;
	dragStart = { x: event.clientX, y: event.clientY, ox: offsetX.value, oy: offsetY.value };
	(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
};

const handlePointerMove = (event: PointerEvent) => {
	if (!isDragging.value) return;
	offsetX.value = dragStart.ox + (event.clientX - dragStart.x);
	offsetY.value = dragStart.oy + (event.clientY - dragStart.y);
	clamp();
};

const handlePointerUp = () => {
	isDragging.value = false;
};

const handleWheel = (event: WheelEvent) => {
	zoom.value = Math.min(MAX_ZOOM, Math.max(1, zoom.value - event.deltaY * 0.002));
};

const handleKey = (event: KeyboardEvent) => {
	const step = 12;
	const moves: Record<string, [number, number]> = {
		ArrowLeft: [step, 0],
		ArrowRight: [-step, 0],
		ArrowUp: [0, step],
		ArrowDown: [0, -step],
	};
	const move = moves[event.key];
	if (!move) return;
	event.preventDefault();
	offsetX.value += move[0];
	offsetY.value += move[1];
	clamp();
};

const handleConfirm = () => {
	const img = image.value;
	if (!img) return;
	const canvas = document.createElement("canvas");
	canvas.width = OUTPUT;
	canvas.height = OUTPUT;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, OUTPUT, OUTPUT);
	ctx.imageSmoothingQuality = "high";
	const sourceSize = VIEW / scale.value;
	ctx.drawImage(
		img,
		-offsetX.value / scale.value,
		-offsetY.value / scale.value,
		sourceSize,
		sourceSize,
		0,
		0,
		OUTPUT,
		OUTPUT,
	);
	canvas.toBlob((blob) => blob && emit("confirm", blob), "image/jpeg", 0.9);
};

const handleClose = () => emit("update:modelValue", false);

onBeforeUnmount(release);
</script>

<template>
	<el-dialog
		:model-value="modelValue"
		:title="translate('profile.avatarTitle')"
		width="380px"
		align-center
		@update:model-value="(value: boolean) => emit('update:modelValue', value)"
	>
		<div class="avatar-cropper">
			<div
				class="avatar-cropper__stage"
				:class="{ 'avatar-cropper__stage--dragging': isDragging }"
				tabindex="0"
				role="application"
				:aria-label="translate('profile.avatarHint')"
				@pointerdown="handlePointerDown"
				@pointermove="handlePointerMove"
				@pointerup="handlePointerUp"
				@pointercancel="handlePointerUp"
				@wheel.prevent="handleWheel"
				@keydown="handleKey"
			>
				<img
					v-if="objectUrl && isReady"
					class="avatar-cropper__image"
					:src="objectUrl"
					alt=""
					draggable="false"
					:style="{
						width: `${width}px`,
						height: `${height}px`,
						transform: `translate(${offsetX}px, ${offsetY}px)`,
					}"
				/>
				<span class="avatar-cropper__mask" aria-hidden="true" />
			</div>
			<el-slider
				v-model="zoom"
				class="avatar-cropper__zoom"
				:min="1"
				:max="MAX_ZOOM"
				:step="0.01"
				:show-tooltip="false"
				:aria-label="translate('profile.avatarZoom')"
			/>
			<p class="avatar-cropper__hint">{{ translate("profile.avatarHint") }}</p>
		</div>
		<template #footer>
			<base-flex justify="flex-end" :gap="3">
				<base-button @click="handleClose">{{ translate("common.cancel") }}</base-button>
				<base-button type="primary" :loading="loading" :disabled="!isReady" @click="handleConfirm">
					{{ translate("profile.avatarApply") }}
				</base-button>
			</base-flex>
		</template>
	</el-dialog>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.avatar-cropper {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: map.get($spacers, 4);

	&__stage {
		position: relative;
		width: 280px;
		height: 280px;
		overflow: hidden;
		border-radius: var(--mt-radius);
		background: var(--mt-color-gray-100);
		cursor: grab;
		touch-action: none;
		user-select: none;

		&--dragging {
			cursor: grabbing;
		}
	}

	&__image {
		position: absolute;
		top: 0;
		left: 0;
		max-width: none;
		pointer-events: none;
	}

	&__mask {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		box-shadow: 0 0 0 300px rgba(15, 18, 38, 0.55);
		outline: 2px solid rgba(255, 255, 255, 0.85);
		outline-offset: -2px;
		pointer-events: none;
	}

	&__zoom {
		width: 280px;
	}

	&__hint {
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 7);
		text-align: center;
	}
}
</style>
