<script lang="ts" setup>
import { computed, onMounted, reactive, watch } from "vue";

import SettingsSystemForm from "@/pages/settings/components/SettingsSystemForm.vue";
import { useSystemSettings } from "@/pages/settings/useSystemSettings";
import type { SystemSettings } from "@/shared/api/v0/schemas";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";

/** Проекты по умолчанию: вид задач и правила переходов статусов */
const { settings, isLoading, isSaving, load, save } = useSystemSettings();
const form = reactive<SystemSettings["projects"]>({ defaultView: "board", strictWorkflow: false });

const sync = () => {
	if (settings.value) Object.assign(form, settings.value.projects);
};
watch(settings, sync);
onMounted(load);

const isDirty = computed(() => JSON.stringify(form) !== JSON.stringify(settings.value?.projects));
const handleSave = () => save({ projects: { ...form } });

/** Схема строгих переходов — та же, что проверяет сервер */
const STRICT_STEPS = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
</script>

<template>
	<el-skeleton :loading="isLoading && !settings" :rows="5" animated>
		<base-flex direction="column" :gap="5">
			<base-card class="settings-card">
				<el-form label-position="top" @submit.prevent>
					<el-form-item :label="translate('settings.projects.defaultView')">
						<el-segmented
							v-model="form.defaultView"
							:options="[
								{ value: 'board', label: translate('settings.workspace.view.board') },
								{ value: 'list', label: translate('settings.workspace.view.list') },
							]"
						/>
					</el-form-item>
				</el-form>
				<p class="settings-card__hint">{{ translate("settings.projects.defaultViewHint") }}</p>
			</base-card>

			<base-card class="settings-card">
				<el-switch v-model="form.strictWorkflow" :active-text="translate('settings.projects.strict')" />
				<p class="settings-card__hint">
					{{ translate(form.strictWorkflow ? "settings.projects.strictOn" : "settings.projects.strictOff") }}
				</p>
				<ol v-if="form.strictWorkflow" class="settings-projects__flow">
					<li v-for="status in STRICT_STEPS" :key="status">{{ translate(`taskStatus.${status}`) }}</li>
				</ol>
				<p v-if="form.strictWorkflow" class="settings-card__hint">{{ translate("settings.projects.strictRules") }}</p>
			</base-card>

			<settings-system-form :dirty="isDirty" :saving="isSaving" @save="handleSave" @reset="sync" />
		</base-flex>
	</el-skeleton>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-card {
	max-width: 640px;
	padding: map.get($spacers, 6);

	&__hint {
		margin: map.get($spacers, 2) 0 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}
}

.settings-projects__flow {
	display: flex;
	flex-wrap: wrap;
	gap: map.get($spacers, 2);
	margin: map.get($spacers, 4) 0 0;
	padding: 0;
	list-style: none;
	counter-reset: step;

	li {
		padding: map.get($spacers, 1) map.get($spacers, 3);
		border-radius: 99px;
		background: var(--mt-color-primary-light);
		color: var(--mt-color-primary);
		font-size: map.get($font-sizes, 7);
		font-weight: 600;
	}

	li + li::before {
		content: "→";
		margin: 0 map.get($spacers, 2) 0 -#{map.get($spacers, 2)};
		color: var(--mt-color-gray-400);
	}
}
</style>
