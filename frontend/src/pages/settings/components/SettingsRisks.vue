<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from "vue";

import { useSystemSettings } from "@/pages/settings/useSystemSettings";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";

/**
 * Сроки и риски: пороги уровней риска (раньше были зашиты в код), напоминание о сроке
 * (раньше — DEADLINE_REMINDER_HOURS в .env) и уведомления о высоком риске.
 */
const { settings, isLoading, isSaving, load, save } = useSystemSettings();

// Пороги в форме — в процентах, на сервер уходят долями
const form = reactive({ medium: 40, high: 70, alertsEnabled: true, alertManagers: true, reminderHours: 24 });
const error = ref("");

watch(settings, (value) => {
	if (!value) return;
	form.medium = Math.round(value.risk.mediumThreshold * 100);
	form.high = Math.round(value.risk.highThreshold * 100);
	form.alertsEnabled = value.risk.alertsEnabled;
	form.alertManagers = value.risk.alertManagers;
	form.reminderHours = value.deadlines.reminderHours;
});

onMounted(load);

const isValid = computed(() => form.high > form.medium);

const isDirty = computed(() => {
	const value = settings.value;
	if (!value) return false;
	return (
		form.medium !== Math.round(value.risk.mediumThreshold * 100) ||
		form.high !== Math.round(value.risk.highThreshold * 100) ||
		form.alertsEnabled !== value.risk.alertsEnabled ||
		form.alertManagers !== value.risk.alertManagers ||
		form.reminderHours !== value.deadlines.reminderHours
	);
});

/** Полоса с зонами риска: видно, что изменится при новых порогах */
const zones = computed(() => [
	{ key: "low", width: form.medium, label: `${translate("forecast.low")} · 0–${form.medium}%` },
	{
		key: "medium",
		width: Math.max(0, form.high - form.medium),
		label: `${translate("forecast.medium")} · ${form.medium}–${form.high}%`,
	},
	{ key: "high", width: Math.max(0, 100 - form.high), label: `${translate("forecast.high")} · ${form.high}–100%` },
]);

const handleSave = async () => {
	error.value = "";
	if (!isValid.value) {
		error.value = translate("settings.risks.orderError");
		return;
	}
	await save({
		risk: {
			mediumThreshold: form.medium / 100,
			highThreshold: form.high / 100,
			alertsEnabled: form.alertsEnabled,
			alertManagers: form.alertManagers,
		},
		deadlines: { reminderHours: form.reminderHours },
	});
};

const handleReset = () => {
	const value = settings.value;
	if (value) settings.value = { ...value };
};
</script>

<template>
	<el-skeleton :loading="isLoading && !settings" :rows="6" animated>
		<base-flex direction="column" :gap="5">
			<base-card class="settings-card">
				<h3>{{ translate("settings.risks.levelsTitle") }}</h3>
				<p class="settings-card__hint">{{ translate("settings.risks.levelsHint") }}</p>
				<div class="settings-risks__zones" role="img" :aria-label="zones.map((zone) => zone.label).join(', ')">
					<span
						v-for="zone in zones"
						:key="zone.key"
						class="settings-risks__zone"
						:class="`settings-risks__zone--${zone.key}`"
						:style="{ width: `${zone.width}%` }"
					/>
				</div>
				<ul class="settings-risks__legend">
					<li v-for="zone in zones" :key="zone.key">
						<span class="settings-risks__dot" :class="`settings-risks__zone--${zone.key}`" />
						{{ zone.label }}
					</li>
				</ul>
				<el-form label-position="top" class="settings-card__form" @submit.prevent>
					<el-form-item :label="translate('settings.risks.medium')">
						<el-input-number v-model="form.medium" :min="5" :max="95" :step="5" />
						<span class="settings-card__unit">%</span>
					</el-form-item>
					<el-form-item :label="translate('settings.risks.high')" :error="error">
						<el-input-number v-model="form.high" :min="5" :max="99" :step="5" />
						<span class="settings-card__unit">%</span>
					</el-form-item>
				</el-form>
			</base-card>

			<base-card class="settings-card">
				<h3>{{ translate("settings.risks.notifyTitle") }}</h3>
				<el-form label-position="top" class="settings-card__form" @submit.prevent>
					<el-form-item :label="translate('settings.risks.reminderHours')">
						<el-input-number v-model="form.reminderHours" :min="1" :max="336" />
						<span class="settings-card__unit">{{ translate("forecast.hours") }}</span>
					</el-form-item>
				</el-form>
				<div class="settings-card__switches">
					<el-switch v-model="form.alertsEnabled" :active-text="translate('settings.risks.alertsEnabled')" />
					<el-switch
						v-model="form.alertManagers"
						:disabled="!form.alertsEnabled"
						:active-text="translate('settings.risks.alertManagers')"
					/>
				</div>
			</base-card>

			<base-flex :gap="3">
				<base-button type="primary" :loading="isSaving" :disabled="!isDirty" @click="handleSave">
					{{ translate("common.save") }}
				</base-button>
				<base-button :disabled="!isDirty" @click="handleReset">{{ translate("settings.reset") }}</base-button>
			</base-flex>
		</base-flex>
	</el-skeleton>
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

	&__form {
		display: flex;
		flex-wrap: wrap;
		gap: 0 map.get($spacers, 6);
		margin-top: map.get($spacers, 4);
	}

	&__unit {
		margin-left: map.get($spacers, 2);
		color: var(--mt-color-gray-500);
	}

	&__switches {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: map.get($spacers, 3);
	}
}

.settings-risks {
	&__zones {
		display: flex;
		gap: 2px;
		height: 12px;
		overflow: hidden;
		border-radius: 99px;
	}

	&__zone {
		transition: width 0.25s var(--mt-ease);

		&--low {
			background: var(--mt-color-success);
		}

		&--medium {
			background: var(--mt-color-warning);
		}

		&--high {
			background: var(--mt-color-danger);
		}
	}

	&__legend {
		display: flex;
		flex-wrap: wrap;
		gap: map.get($spacers, 2) map.get($spacers, 5);
		margin: map.get($spacers, 3) 0 0;
		padding: 0;
		color: var(--mt-color-gray-600);
		font-size: map.get($font-sizes, 7);
		list-style: none;

		li {
			display: inline-flex;
			align-items: center;
			gap: map.get($spacers, 2);
		}
	}

	&__dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
}
</style>
