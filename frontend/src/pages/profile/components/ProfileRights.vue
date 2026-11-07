<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { PermissionMatrix, SystemRole } from "@/shared/api/v0/schemas";
import { PERMISSION_GROUPS, PERMISSIONS, ROLE_DEFAULTS } from "@/shared/lib/access/permissions";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { roleLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";

const emit = defineEmits<{
	saved: [];
}>();

const props = defineProps<{
	userId: string;
	systemRole: SystemRole;
	permissions: string[];
}>();

const role = ref<SystemRole>(props.systemRole);
const selectedPermissions = ref<string[]>([...props.permissions]);
const isSaving = ref(false);

const { state: matrix } = useFetch(baseApi.settings.getPermissionMatrix, "data", {
	immediate: true,
});

const permissionGroups = computed(() =>
	PERMISSION_GROUPS.map((group) => ({
		group,
		items: PERMISSIONS.filter((item) => item.group === group),
	})),
);

const applyProps = () => {
	role.value = props.systemRole;
	selectedPermissions.value = [...props.permissions];
};

const handleRole = (value: string) => {
	const nextRole = value as SystemRole;
	role.value = nextRole;
	const roleGrants = ((matrix.value as PermissionMatrix | undefined)?.grants || []).filter(
		(grant) => grant.role === nextRole,
	);
	selectedPermissions.value = roleGrants.length
		? roleGrants.filter((grant) => grant.enabled).map((grant) => grant.code)
		: [...ROLE_DEFAULTS[nextRole]];
};

const handleToggle = (code: string, enabled: boolean) => {
	selectedPermissions.value = enabled
		? [...new Set([...selectedPermissions.value, code])]
		: selectedPermissions.value.filter((item) => item !== code);
};

const handlePermissionChange = (code: string) => (value: string | number | boolean) => {
	handleToggle(code, value === true || value === "true");
};

const handleReset = () => applyProps();

const handleSave = async () => {
	isSaving.value = true;
	try {
		await baseApi.users.updateRights({ id: props.userId }, undefined, {
			systemRole: role.value,
			permissions: selectedPermissions.value,
		});
		emit("saved");
	} finally {
		isSaving.value = false;
	}
};

watch(() => [props.systemRole, props.permissions.join(",")], applyProps);
</script>

<template>
	<base-card class="profile-rights">
		<h3>{{ translate("profile.rights") }}</h3>
		<base-flex direction="column" :gap="4">
			<el-form-item :label="translate('users.role')">
				<el-select :model-value="role" @change="handleRole">
					<el-option :label="roleLabel('ADMIN')" value="ADMIN" />
					<el-option :label="roleLabel('MANAGER')" value="MANAGER" />
					<el-option :label="roleLabel('EXECUTOR')" value="EXECUTOR" />
				</el-select>
			</el-form-item>
			<section v-for="group in permissionGroups" :key="group.group" class="profile-rights__group">
				<h4>{{ translate(`permissionGroup.${group.group}`) }}</h4>
				<base-flex direction="column" :gap="2">
					<el-checkbox
						v-for="item in group.items"
						:key="item.code"
						:model-value="selectedPermissions.includes(item.code)"
						@change="handlePermissionChange(item.code)"
					>
						{{ translate(`permission.${item.code}`) }}
					</el-checkbox>
				</base-flex>
			</section>
			<base-flex justify="flex-start" :gap="3">
				<base-button type="primary" :loading="isSaving" @click="handleSave">
					{{ translate("settings.saveRights") }}
				</base-button>
				<base-button @click="handleReset">{{ translate("common.cancel") }}</base-button>
			</base-flex>
		</base-flex>
	</base-card>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.profile-rights {
	padding: map.get($spacers, 6);

	h3,
	h4 {
		margin: 0 0 map.get($spacers, 4);
		font-size: map.get($font-sizes, 5);
	}

	h4 {
		font-size: map.get($font-sizes, 6);
	}

	&__group + &__group {
		margin-top: map.get($spacers, 4);
	}

	:deep(.el-form-item) {
		margin-bottom: 0;
	}
}
</style>
