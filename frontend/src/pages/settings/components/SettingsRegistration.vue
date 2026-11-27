<script lang="ts" setup>
import { computed, onMounted, reactive, watch } from "vue";

import SettingsSystemForm from "@/pages/settings/components/SettingsSystemForm.vue";
import { useSystemSettings } from "@/pages/settings/useSystemSettings";
import type { SystemSettings } from "@/shared/api/v0/schemas";
import { roleLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";

/** Кто может зарегистрироваться сам и с какой ролью. Приглашённых эти правила не ограничивают */
const { settings, isLoading, isSaving, load, save } = useSystemSettings();
const form = reactive<SystemSettings["registration"]>({ open: true, allowedDomains: [], defaultRole: "EXECUTOR" });

const sync = () => {
	if (settings.value) Object.assign(form, structuredClone(settings.value.registration));
};
watch(settings, sync);
onMounted(load);

const isDirty = computed(() => JSON.stringify(form) !== JSON.stringify(settings.value?.registration));

/** Домены вводятся как теги: Enter или запятая добавляют домен */
const handleDomains = (value: string[]) => {
	form.allowedDomains = [
		...new Set(
			value
				.flatMap((item) => item.split(/[,\s]+/))
				.map((item) => item.trim().toLowerCase().replace(/^@/, ""))
				.filter(Boolean),
		),
	];
};

const handleSave = () => save({ registration: { ...form, allowedDomains: [...form.allowedDomains] } });
</script>

<template>
	<el-skeleton :loading="isLoading && !settings" :rows="5" animated>
		<base-flex direction="column" :gap="5">
			<base-card class="settings-card">
				<el-switch v-model="form.open" :active-text="translate('settings.registration.open')" />
				<p class="settings-card__hint">
					{{ translate(form.open ? "settings.registration.openHint" : "settings.registration.closedHint") }}
				</p>
				<el-form label-position="top" @submit.prevent>
					<el-form-item :label="translate('settings.registration.domains')">
						<el-select
							:model-value="form.allowedDomains"
							multiple
							filterable
							allow-create
							default-first-option
							:reserve-keyword="false"
							:disabled="!form.open"
							:placeholder="translate('settings.registration.domainsPlaceholder')"
							class="settings-card__wide"
							@update:model-value="handleDomains"
						/>
					</el-form-item>
					<p class="settings-card__hint">{{ translate("settings.registration.domainsHint") }}</p>
					<el-form-item :label="translate('settings.registration.defaultRole')">
						<el-segmented
							v-model="form.defaultRole"
							:options="[
								{ value: 'EXECUTOR', label: roleLabel('EXECUTOR') },
								{ value: 'MANAGER', label: roleLabel('MANAGER') },
							]"
						/>
					</el-form-item>
				</el-form>
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
		margin: map.get($spacers, 2) 0 map.get($spacers, 4);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}

	&__wide {
		width: 100%;
	}
}
</style>
