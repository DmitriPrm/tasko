<script lang="ts" setup>
import { ElMessage } from "element-plus";
import { computed, onMounted, ref } from "vue";

import { useSystemSettings } from "@/pages/settings/useSystemSettings";
import { baseApi } from "@/shared/api/baseApi";
import type { MlStatus } from "@/shared/api/v0/schemas";
import { openConfirm } from "@/shared/lib/dialog/openConfirm";
import { formatDateTime } from "@/shared/lib/helpers/formatDate";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";

/**
 * Прогнозирование: состояние ML-сервиса, активные модели с метриками и действия
 * для администратора — выключить ML, перечитать модели после обучения, пересчитать прогнозы.
 */
const { settings, load, save } = useSystemSettings();
const status = ref<MlStatus | null>(null);
const isChecking = ref(false);
const isReloading = ref(false);
const isRecomputing = ref(false);

const loadStatus = async () => {
	isChecking.value = true;
	try {
		status.value = (await baseApi.settings.getMlStatus()).data?.data ?? null;
	} finally {
		isChecking.value = false;
	}
};

onMounted(() => Promise.all([load(), loadStatus()]));

const state = computed(() => {
	if (!status.value) return null;
	if (status.value.configured === false) return { type: "info", text: translate("settings.ml.notConfigured") };
	if (!settings.value?.ml.enabled) return { type: "info", text: translate("settings.ml.switchedOff") };
	if (!status.value.available) return { type: "danger", text: translate("settings.ml.unavailable") };
	if (!status.value.models?.duration && !status.value.models?.risk) {
		return { type: "warning", text: translate("settings.ml.noModels") };
	}
	return { type: "success", text: translate("settings.ml.working") };
});

const models = computed(() =>
	(["duration", "risk"] as const)
		.map((kind) => ({ kind, model: status.value?.models?.[kind] ?? null }))
		.filter((item) => item.model),
);

const formatMetric = (key: string, value: number) =>
	["MAE", "RMSE"].includes(key) ? `${value.toFixed(1)} ${translate("forecast.hours")}` : value.toFixed(2);

const handleToggle = async (value: string | number | boolean) => {
	await save({ ml: { enabled: Boolean(value) } });
	await loadStatus();
};

const handleReload = async () => {
	isReloading.value = true;
	try {
		const result = (await baseApi.settings.reloadMlModels()).data?.data;
		ElMessage({
			type: result?.reloaded ? "success" : "warning",
			message: translate(result?.reloaded ? "settings.ml.reloaded" : "settings.ml.unavailable"),
		});
		await loadStatus();
	} finally {
		isReloading.value = false;
	}
};

const handleRecompute = async () => {
	const confirmed = await openConfirm({
		title: translate("settings.ml.recompute"),
		text: translate("settings.ml.recomputeText"),
		confirmLabel: translate("settings.ml.recompute"),
	});
	if (!confirmed) return;
	isRecomputing.value = true;
	try {
		const result = (await baseApi.settings.recomputeForecasts()).data?.data;
		ElMessage({
			type: "success",
			message: `${translate("settings.ml.recomputed")}: ${result?.refreshed ?? 0} / ${result?.total ?? 0}`,
		});
	} finally {
		isRecomputing.value = false;
	}
};
</script>

<template>
	<base-flex direction="column" :gap="5">
		<base-card class="settings-card">
			<base-flex align="center" justify="space-between" :gap="4" wrap="wrap">
				<div>
					<h3>{{ translate("settings.ml.serviceTitle") }}</h3>
					<p class="settings-card__hint">{{ translate("settings.ml.serviceHint") }}</p>
				</div>
				<el-switch
					v-if="settings"
					:model-value="settings.ml.enabled"
					:disabled="status?.configured === false"
					:active-text="translate('settings.ml.enabled')"
					@change="handleToggle"
				/>
			</base-flex>
			<el-skeleton :loading="isChecking && !status" :rows="1" animated>
				<el-alert v-if="state" :type="state.type" :title="state.text" :closable="false" show-icon />
			</el-skeleton>
			<base-flex :gap="3" wrap="wrap" class="settings-card__actions">
				<base-button :loading="isChecking" @click="loadStatus">{{ translate("settings.ml.check") }}</base-button>
				<base-button :loading="isReloading" :disabled="status?.configured === false" @click="handleReload">
					{{ translate("settings.ml.reload") }}
				</base-button>
				<base-button
					type="primary"
					:loading="isRecomputing"
					:disabled="!status?.available || !settings?.ml.enabled"
					@click="handleRecompute"
				>
					{{ translate("settings.ml.recompute") }}
				</base-button>
			</base-flex>
		</base-card>

		<base-card v-for="item in models" :key="item.kind" class="settings-card">
			<base-flex align="center" justify="space-between" :gap="3" wrap="wrap">
				<h3>{{ translate(`settings.ml.kind.${item.kind}`) }}</h3>
				<el-tag v-if="item.model?.dataSource === 'synthetic'" type="warning" size="small">
					{{ translate("settings.ml.synthetic") }}
				</el-tag>
			</base-flex>
			<dl class="settings-ml__facts">
				<div>
					<dt>{{ translate("settings.ml.algorithm") }}</dt>
					<dd>{{ item.model?.algorithm }}</dd>
				</div>
				<div>
					<dt>{{ translate("settings.ml.version") }}</dt>
					<dd class="settings-ml__mono">{{ item.model?.version }}</dd>
				</div>
				<div>
					<dt>{{ translate("settings.ml.trainedAt") }}</dt>
					<dd>{{ formatDateTime(item.model?.trainedAt) || "—" }}</dd>
				</div>
				<div>
					<dt>{{ translate("settings.ml.sampleSize") }}</dt>
					<dd>{{ item.model?.sampleSize ?? "—" }}</dd>
				</div>
			</dl>
			<div v-if="item.model?.metrics" class="settings-ml__metrics">
				<span v-for="(value, key) in item.model.metrics" :key="key" class="settings-ml__metric">
					<span>{{ key }}</span>
					<strong>{{ formatMetric(String(key), value) }}</strong>
				</span>
			</div>
		</base-card>

		<p class="settings-ml__train">{{ translate("settings.ml.trainHint") }}</p>
	</base-flex>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-card {
	max-width: 720px;
	padding: map.get($spacers, 5) map.get($spacers, 6);

	h3 {
		margin: 0;
		font-size: map.get($font-sizes, 5);
	}

	&__hint {
		margin: map.get($spacers, 1) 0 map.get($spacers, 4);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 7);
	}

	&__actions {
		margin-top: map.get($spacers, 4);
	}
}

.settings-ml {
	&__facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: map.get($spacers, 3);
		margin: map.get($spacers, 4) 0 0;

		dt {
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 8);
			font-weight: 600;
		}

		dd {
			margin: 2px 0 0;
			font-size: map.get($font-sizes, 7);
			overflow-wrap: anywhere;
		}
	}

	&__mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: map.get($font-sizes, 8) !important;
	}

	&__metrics {
		display: flex;
		flex-wrap: wrap;
		gap: map.get($spacers, 2);
		margin-top: map.get($spacers, 4);
	}

	&__metric {
		display: inline-flex;
		gap: map.get($spacers, 2);
		padding: map.get($spacers, 1) map.get($spacers, 3);
		border-radius: 99px;
		background: var(--mt-color-gray-50);
		font-size: map.get($font-sizes, 8);

		span {
			color: var(--mt-color-gray-500);
		}

		strong {
			font-variant-numeric: tabular-nums;
		}
	}

	&__train {
		max-width: 720px;
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}
}
</style>
