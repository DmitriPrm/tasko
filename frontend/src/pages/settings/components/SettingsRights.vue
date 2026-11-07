<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { PermissionMatrix, SystemRole } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { roleLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import { Search } from "@/shared/ui/icon/icons";

type Grants = Record<string, Record<string, boolean>>;

// Эти права нельзя снять у роли (иначе администратор потеряет доступ к настройке прав)
const LOCKED: Record<string, string[]> = { ADMIN: ["SETTINGS_PERMISSIONS"] };

const { state, isLoading, fetch } = useFetch(baseApi.settings.getPermissionMatrix, "data", {
	immediate: true,
});

const grants = ref<Grants>({});
const initial = ref<Grants>({});
const search = ref("");
const closedGroups = ref<string[]>([]);
const isSaving = ref(false);

const buildGrants = (matrix: PermissionMatrix): Grants => {
	const next: Grants = {};
	for (const role of matrix.roles) {
		next[role] = {};
		for (const item of matrix.items) {
			next[role][item.code] = matrix.grants.some(
				(grant) => grant.role === role && grant.code === item.code && grant.enabled,
			);
		}
	}
	return next;
};

watch(state, (matrix) => {
	if (!matrix) return;
	const built = buildGrants(matrix);
	initial.value = built;
	grants.value = JSON.parse(JSON.stringify(built)) as Grants;
});

const roles = computed(() => (state.value?.roles || []) as SystemRole[]);
const items = computed(() => (state.value?.items || []) as { code: string; group: string }[]);

const isLocked = (role: string, code: string) => Boolean(LOCKED[role]?.includes(code));
const isChanged = (role: string, code: string) => grants.value[role]?.[code] !== initial.value[role]?.[code];

const groups = computed(() => {
	const query = search.value.trim().toLowerCase();
	const map = new Map<string, { code: string; label: string }[]>();
	for (const item of items.value) {
		const label = translate(`permission.${item.code}`);
		if (query && !label.toLowerCase().includes(query)) continue;
		const list = map.get(item.group) ?? [];
		list.push({ code: item.code, label });
		map.set(item.group, list);
	}
	return [...map.entries()].map(([id, rows]) => ({ id, title: translate(`permissionGroup.${id}`), rows }));
});

const changesCount = computed(() =>
	roles.value.reduce(
		(sum, role) => sum + items.value.filter((item) => isChanged(role, item.code)).length,
		0,
	),
);

const enabledCount = (role: string) => Object.values(grants.value[role] ?? {}).filter(Boolean).length;

const isOpen = (id: string) => Boolean(search.value.trim()) || !closedGroups.value.includes(id);

const handleToggleGroup = (id: string) => {
	closedGroups.value = closedGroups.value.includes(id)
		? closedGroups.value.filter((item) => item !== id)
		: [...closedGroups.value, id];
};

const setGrant = (role: string, code: string, enabled: boolean) => {
	if (isLocked(role, code)) return;
	grants.value = { ...grants.value, [role]: { ...grants.value[role], [code]: enabled } };
};

const groupState = (role: string, rows: { code: string }[]) => {
	const editable = rows.filter((row) => !isLocked(role, row.code));
	const on = editable.filter((row) => grants.value[role]?.[row.code]).length;
	return {
		checked: editable.length > 0 && on === editable.length,
		indeterminate: on > 0 && on < editable.length,
		disabled: editable.length === 0,
	};
};

const handleToggleRoleInGroup = (role: string, rows: { code: string }[], enabled: boolean) => {
	for (const row of rows) setGrant(role, row.code, enabled);
};

const handleReset = () => {
	grants.value = JSON.parse(JSON.stringify(initial.value)) as Grants;
};

const handleSave = async () => {
	isSaving.value = true;
	try {
		const payload = Object.entries(grants.value).flatMap(([role, codes]) =>
			Object.entries(codes).map(([code, enabled]) => ({ role, code, enabled })),
		);
		await baseApi.settings.savePermissionMatrix(undefined, undefined, { grants: payload });
		await fetch();
	} finally {
		isSaving.value = false;
	}
};
</script>

<template>
	<div class="settings-rights" :style="{ '--roles': roles.length }">
		<base-flex align="center" justify="space-between" :gap="4" wrap="wrap">
			<el-input
				v-model="search"
				class="settings-rights__search"
				clearable
				:placeholder="translate('settings.searchRights')"
			>
				<template #prefix>
					<el-icon :size="16"><search /></el-icon>
				</template>
			</el-input>
			<p class="settings-rights__hint">{{ translate("settings.rightsHint") }}</p>
		</base-flex>

		<el-skeleton :loading="isLoading && !state" animated>
			<div class="settings-rights__table">
				<div class="settings-rights__row settings-rights__row--head">
					<span>{{ translate("settings.rights") }}</span>
					<span v-for="role in roles" :key="role" class="settings-rights__role">
						<strong>{{ roleLabel(role) }}</strong>
						<small>{{ enabledCount(role) }}/{{ items.length }}</small>
					</span>
				</div>

				<el-empty v-if="!groups.length" :description="translate('settings.noResults')" />

				<section v-for="group in groups" :key="group.id" class="settings-rights__group">
					<div class="settings-rights__row settings-rights__row--group">
						<button class="settings-rights__toggle" type="button" @click="handleToggleGroup(group.id)">
							<span class="settings-rights__chevron" :class="{ 'settings-rights__chevron--open': isOpen(group.id) }">›</span>
							<strong>{{ group.title }}</strong>
							<span class="settings-rights__count">{{ group.rows.length }}</span>
						</button>
						<span v-for="role in roles" :key="role" class="settings-rights__cell">
							<el-checkbox
								:model-value="groupState(role, group.rows).checked"
								:indeterminate="groupState(role, group.rows).indeterminate"
								:disabled="groupState(role, group.rows).disabled"
								:title="translate('settings.toggleGroup')"
								@change="(value) => handleToggleRoleInGroup(role, group.rows, value === true)"
							/>
						</span>
					</div>

					<template v-if="isOpen(group.id)">
						<div
							v-for="row in group.rows"
							:key="row.code"
							class="settings-rights__row settings-rights__row--item"
						>
							<span class="settings-rights__label">{{ row.label }}</span>
							<span v-for="role in roles" :key="role" class="settings-rights__cell">
								<el-switch
									:model-value="Boolean(grants[role]?.[row.code])"
									:disabled="isLocked(role, row.code)"
									:title="isLocked(role, row.code) ? translate('settings.locked') : undefined"
									:class="{ 'settings-rights__switch--changed': isChanged(role, row.code) }"
									@change="(value) => setGrant(role, row.code, value === true)"
								/>
							</span>
						</div>
					</template>
				</section>
			</div>
		</el-skeleton>

		<div v-if="changesCount" class="settings-rights__bar">
			<span>{{ translate("settings.unsaved") }}: <strong>{{ changesCount }}</strong></span>
			<base-flex :gap="3">
				<base-button :disabled="isSaving" @click="handleReset">{{ translate("settings.reset") }}</base-button>
				<base-button type="primary" :loading="isSaving" @click="handleSave">
					{{ translate("settings.saveRights") }}
				</base-button>
			</base-flex>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-rights {
	display: flex;
	flex-direction: column;
	gap: map.get($spacers, 5);

	&__search {
		width: 320px;
		max-width: 100%;

		:deep(.el-input__wrapper) {
			border-radius: 99px;
			box-shadow: 0 0 0 1px var(--mt-color-gray-200) inset;
		}
	}

	&__hint {
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
	}

	&__table {
		overflow: hidden;
		border: 1px solid var(--mt-color-gray-100);
		border-radius: var(--mt-radius);
		background: var(--mt-color-white);
		box-shadow: var(--mt-shadow);
	}

	&__row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) repeat(var(--roles, 3), minmax(110px, 140px));
		align-items: center;
		gap: map.get($spacers, 3);
		padding: 0 map.get($spacers, 5);

		&--head {
			min-height: 56px;
			border-bottom: 1px solid var(--mt-color-gray-100);
			background: var(--mt-color-gray-50);
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 7);
			font-weight: 600;
		}

		&--group {
			min-height: 48px;
			border-top: 1px solid var(--mt-color-gray-100);
			background: var(--mt-color-gray-50);
		}

		&--item {
			min-height: 48px;
			border-top: 1px solid var(--mt-color-gray-100);
			transition: background 0.15s var(--mt-ease);

			&:hover {
				background: var(--mt-color-gray-50);
			}
		}
	}

	&__group:first-of-type .settings-rights__row--group {
		border-top: 0;
	}

	&__role {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		text-align: center;

		strong {
			color: var(--mt-color-text);
			font-size: map.get($font-sizes, 6);
		}

		small {
			font-size: map.get($font-sizes, 8);
			font-weight: 500;
		}
	}

	&__toggle {
		display: flex;
		align-items: center;
		gap: map.get($spacers, 3);
		padding: map.get($spacers, 3) 0;
		border: 0;
		background: transparent;
		color: var(--mt-color-text);
		font: inherit;
		text-align: left;
		cursor: pointer;

		strong {
			font-size: map.get($font-sizes, 6);
		}
	}

	&__chevron {
		display: inline-block;
		width: 12px;
		color: var(--mt-color-gray-400);
		font-size: 18px;
		line-height: 1;
		transition: transform 0.18s var(--mt-ease);

		&--open {
			transform: rotate(90deg);
		}
	}

	&__count {
		min-width: 22px;
		padding: 1px map.get($spacers, 2);
		border-radius: 99px;
		background: var(--mt-color-white);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
		text-align: center;
	}

	&__label {
		padding-left: map.get($spacers, 6);
		font-size: map.get($font-sizes, 6);
	}

	&__cell {
		display: flex;
		justify-content: center;
	}

	&__switch--changed {
		:deep(.el-switch__core) {
			box-shadow: 0 0 0 3px var(--mt-color-warning-light);
		}
	}

	&__bar {
		position: sticky;
		z-index: 10;
		bottom: map.get($spacers, 5);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: map.get($spacers, 4);
		padding: map.get($spacers, 3) map.get($spacers, 5);
		border: 1px solid var(--mt-color-gray-100);
		border-radius: var(--mt-radius);
		background: var(--mt-color-white);
		box-shadow: var(--mt-shadow-hover);
		font-size: map.get($font-sizes, 6);
	}
}
</style>
