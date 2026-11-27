<script lang="ts" setup>
import { computed, onMounted } from "vue";

import type { UserPreferences } from "@/shared/api/v0/schemas";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import { useUserSettingsStore } from "@/store/userSettings";

type NotificationKey = keyof UserPreferences["notifications"];

/**
 * Какие уведомления получать и где: в системе и/или на почту. Изменения сохраняются сразу.
 * Приглашения в проект в системе отключить нельзя — без них не принять приглашение.
 */
const store = useUserSettingsStore();
onMounted(() => store.ensureLoaded());

const TYPES: NotificationKey[] = [
	"TASK_ASSIGNED",
	"STATUS_CHANGED",
	"DEADLINE_CHANGED",
	"DEADLINE_APPROACHING",
	"HIGH_RISK",
	"PROJECT_INVITATION",
];
const REQUIRED_IN_APP: NotificationKey[] = ["PROJECT_INVITATION"];

const rows = computed(() =>
	TYPES.map((type) => ({
		type,
		channel: store.preferences?.notifications[type] ?? { inApp: true, email: false },
	})),
);

const handleToggle = (type: NotificationKey, channel: "inApp" | "email", value: boolean) =>
	store.updatePreferences({ notifications: { [type]: { [channel]: value } } } as Partial<UserPreferences>);
</script>

<template>
	<base-card class="settings-card">
		<el-skeleton :loading="!store.preferences" :rows="5" animated>
			<table class="settings-notifications">
				<thead>
					<tr>
						<th scope="col">{{ translate("settings.notifications.event") }}</th>
						<th scope="col">{{ translate("settings.notifications.inApp") }}</th>
						<th scope="col">{{ translate("settings.notifications.email") }}</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in rows" :key="row.type">
						<th scope="row">
							<span>{{ translate(`settings.notifications.types.${row.type}.title`) }}</span>
							<small>{{ translate(`settings.notifications.types.${row.type}.hint`) }}</small>
						</th>
						<td>
							<el-switch
								:model-value="row.channel.inApp"
								:disabled="REQUIRED_IN_APP.includes(row.type)"
								:aria-label="`${translate(`settings.notifications.types.${row.type}.title`)}: ${translate('settings.notifications.inApp')}`"
								@change="(value: string | number | boolean) => handleToggle(row.type, 'inApp', Boolean(value))"
							/>
						</td>
						<td>
							<el-switch
								:model-value="row.channel.email"
								:aria-label="`${translate(`settings.notifications.types.${row.type}.title`)}: ${translate('settings.notifications.email')}`"
								@change="(value: string | number | boolean) => handleToggle(row.type, 'email', Boolean(value))"
							/>
						</td>
					</tr>
				</tbody>
			</table>
			<p class="settings-card__hint">{{ translate("settings.notifications.hint") }}</p>
		</el-skeleton>
	</base-card>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-card {
	max-width: 720px;
	padding: map.get($spacers, 4) map.get($spacers, 6) map.get($spacers, 5);

	&__hint {
		margin: map.get($spacers, 4) 0 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
	}
}

.settings-notifications {
	width: 100%;
	border-collapse: collapse;

	th,
	td {
		padding: map.get($spacers, 3) map.get($spacers, 2);
		border-bottom: 1px solid var(--mt-color-gray-100);
		text-align: left;
		vertical-align: middle;
	}

	thead th {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
		font-weight: 650;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	thead th + th,
	td {
		width: 120px;
		text-align: center;
	}

	tbody th {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-weight: 550;

		small {
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 8);
			font-weight: 400;
		}
	}

	tbody tr:last-child th,
	tbody tr:last-child td {
		border-bottom: 0;
	}
}
</style>
