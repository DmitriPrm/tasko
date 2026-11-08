<script lang="ts" setup>
import { ArrowLeft } from "@/shared/ui/icon/icons";
import { computed, ref, useSlots, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { translate } from "@/shared/lib/theming/i18n/translate";

interface Props {
	title: string;
	description?: string;
}

defineProps<Props>();

const route = useRoute();
const router = useRouter();
const slots = useSlots();
const historyBackPath = ref("");

const parentRouteName = computed(() => (typeof route.meta.parent === "string" ? route.meta.parent : ""));

const canHistoryBack = computed(() => isInAppHistoryPath(historyBackPath.value));

const canGoBack = computed(() => Boolean(parentRouteName.value) || canHistoryBack.value);

const readHistoryBackPath = () => {
	const back = router.options.history.state.back;
	return typeof back === "string" ? back : "";
};

const isInAppHistoryPath = (path: string) => {
	if (!path.startsWith("/") || path.startsWith("//")) return false;
	return router.resolve(path).matched.length > 0;
};

const syncHistoryBack = () => {
	historyBackPath.value = readHistoryBackPath();
};

const handleBack = () => {
	if (parentRouteName.value) {
		router.push({ name: parentRouteName.value });
		return;
	}

	const backPath = readHistoryBackPath();
	if (!isInAppHistoryPath(backPath)) return;
	router.back();
};

watch(() => route.fullPath, syncHistoryBack, { immediate: true });
</script>

<template>
	<section class="base-page">
		<base-flex class="base-page__back" align="center" width="full">
			<base-button
				class="base-page__back-button"
				text
				type="primary"
				:disabled="!canGoBack"
				:aria-label="translate('common.back')"
				@click="handleBack"
			>
				<base-flex align="center" :gap="1">
					<el-icon :size="16" aria-hidden="true">
						<arrow-left />
					</el-icon>
					<span>{{ translate("common.back") }}</span>
				</base-flex>
			</base-button>
		</base-flex>
		<base-flex class="base-page__header" align="center" justify="space-between" :gap="4" wrap="wrap" width="full">
			<div class="base-page__heading">
				<slot name="heading">
					<h1 class="base-page__title">{{ title }}</h1>
				</slot>
				<p v-if="description" class="base-page__description">{{ description }}</p>
				<slot name="subtitle" />
			</div>
			<base-flex v-if="slots.actions" class="base-page__actions" align="center" justify="flex-end" :gap="0">
				<slot name="actions" />
			</base-flex>
		</base-flex>
		<slot />
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.base-page {
	&__back {
		min-height: map.get($spacers, 5);
		margin-bottom: map.get($spacers, 1);
	}

	&__back &__back-button {
		height: auto;
		margin: 0;
		padding: map.get($spacers, 1) map.get($spacers, 2) map.get($spacers, 1) 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);

		&:hover:not(.is-disabled) {
			color: var(--mt-color-primary);
		}
	}

	&__header {
		margin-bottom: map.get($spacers, 6);
	}

	&__heading {
		min-width: 0;
	}

	&__actions {
		min-width: 0;
		flex: 1 1 16rem;
	}

	&__title {
		margin: 0;
		font-size: map.get($font-sizes, 1);
		font-weight: 700;
		letter-spacing: -0.025em;
	}

	@media (max-width: 768px) {
		&__header {
			margin-bottom: map.get($spacers, 5);
		}

		&__actions {
			flex: 1 1 100%;

			> * {
				width: 100%;
			}
		}

		&__title {
			font-size: map.get($font-sizes, 2);
		}
	}

	&__description {
		margin: map.get($spacers, 2) 0 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
	}
}
</style>
