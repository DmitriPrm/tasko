<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";

import SettingsSystemForm from "@/pages/settings/components/SettingsSystemForm.vue";
import { useSystemSettings } from "@/pages/settings/useSystemSettings";
import { ATTACHMENT_GROUPS, enabledGroups, typesForGroups } from "@/shared/lib/helpers/attachmentTypes";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";

/** Вложения: максимальный размер и разрешённые типы. Сервер не примет файл больше 50 МБ при любой настройке */
const { settings, isLoading, isSaving, load, save } = useSystemSettings();
const maxSizeMb = ref(10);
const groups = ref<string[]>([]);

const sync = () => {
	if (!settings.value) return;
	maxSizeMb.value = settings.value.attachments.maxSizeMb;
	groups.value = enabledGroups(settings.value.attachments.allowedTypes);
};
watch(settings, sync);
onMounted(load);

const isDirty = computed(() => {
	const value = settings.value?.attachments;
	if (!value) return false;
	const saved = enabledGroups(value.allowedTypes);
	const sameGroups = saved.length === groups.value.length && saved.every((id) => groups.value.includes(id));
	return value.maxSizeMb !== maxSizeMb.value || !sameGroups;
});

const handleSave = () =>
	save({ attachments: { maxSizeMb: maxSizeMb.value, allowedTypes: typesForGroups(groups.value) } });
</script>

<template>
	<el-skeleton :loading="isLoading && !settings" :rows="6" animated>
		<base-flex direction="column" :gap="5">
			<base-card class="settings-card">
				<el-form label-position="top" @submit.prevent>
					<el-form-item :label="translate('settings.files.maxSize')">
						<el-input-number v-model="maxSizeMb" :min="1" :max="50" />
						<span class="settings-card__unit">{{ translate("settings.files.mb") }}</span>
					</el-form-item>
					<el-form-item
						:label="translate('settings.files.types')"
						:error="groups.length ? '' : translate('settings.files.noTypes')"
					>
						<el-checkbox-group v-model="groups" class="settings-files__groups">
							<el-checkbox v-for="group in ATTACHMENT_GROUPS" :key="group.id" :value="group.id">
								<span>{{ translate(`settings.files.groups.${group.id}`) }}</span>
								<small>{{ group.extensions.join(" ") }}</small>
							</el-checkbox>
						</el-checkbox-group>
					</el-form-item>
				</el-form>
				<p class="settings-card__hint">{{ translate("settings.files.hint") }}</p>
			</base-card>
			<settings-system-form
				:dirty="isDirty"
				:saving="isSaving"
				:disabled="!groups.length"
				@save="handleSave"
				@reset="sync"
			/>
		</base-flex>
	</el-skeleton>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-card {
	max-width: 640px;
	padding: map.get($spacers, 6);

	&__unit {
		margin-left: map.get($spacers, 2);
		color: var(--mt-color-gray-500);
	}

	&__hint {
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}
}

.settings-files__groups {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: map.get($spacers, 1) map.get($spacers, 4);

	small {
		margin-left: map.get($spacers, 2);
		color: var(--mt-color-gray-400);
	}
}
</style>
