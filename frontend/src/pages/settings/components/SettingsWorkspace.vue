<script lang="ts" setup>
import { computed, onMounted } from "vue";

import type { UserPreferences } from "@/shared/api/v0/schemas";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import { useUserSettingsStore } from "@/store/userSettings";

/** Рабочее место: куда попадать после входа, вид проекта по умолчанию, закрытые задачи в списке */
const store = useUserSettingsStore();
onMounted(() => store.ensureLoaded());

const START_PAGES: UserPreferences["startPage"][] = ["dashboard", "tasks", "projects"];

/** «Как в системе» — вид, который задал администратор */
const systemView = computed(() => store.system?.projects.defaultView ?? "board");
const viewOptions = computed(() => [
	{
		value: "system",
		label: `${translate("settings.workspace.viewSystem")} (${translate(`settings.workspace.view.${systemView.value}`)})`,
	},
	{ value: "board", label: translate("settings.workspace.view.board") },
	{ value: "list", label: translate("settings.workspace.view.list") },
]);

const handleStartPage = (value: UserPreferences["startPage"]) => store.updatePreferences({ startPage: value });
const handleView = (value: string) =>
	store.updatePreferences({ projectView: value === "system" ? null : (value as "board" | "list") });
const handleClosed = (value: string | number | boolean) => store.updatePreferences({ showClosedTasks: Boolean(value) });
</script>

<template>
	<base-card class="settings-card">
		<el-skeleton :loading="!store.preferences" :rows="4" animated>
			<el-form v-if="store.preferences" label-position="top" @submit.prevent>
				<el-form-item :label="translate('settings.workspace.startPage')">
					<el-select :model-value="store.preferences.startPage" class="settings-card__select" @change="handleStartPage">
						<el-option
							v-for="page in START_PAGES"
							:key="page"
							:label="translate(`settings.workspace.pages.${page}`)"
							:value="page"
						/>
					</el-select>
				</el-form-item>
				<el-form-item :label="translate('settings.workspace.projectView')">
					<el-segmented
						:model-value="store.preferences.projectView ?? 'system'"
						:options="viewOptions"
						@change="handleView"
					/>
				</el-form-item>
				<el-switch
					:model-value="store.preferences.showClosedTasks"
					:active-text="translate('settings.workspace.showClosed')"
					@change="handleClosed"
				/>
				<p class="settings-card__hint">{{ translate("settings.workspace.hint") }}</p>
			</el-form>
		</el-skeleton>
	</base-card>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-card {
	max-width: 640px;
	padding: map.get($spacers, 6);

	&__select {
		width: 260px;
	}

	&__hint {
		margin: map.get($spacers, 4) 0 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}
}
</style>
