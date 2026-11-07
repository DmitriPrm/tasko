<script lang="ts" setup>
import { Lock, Unlock } from "@/shared/ui/icon/icons";
import { computed } from "vue";

import UserCreateDialog from "@/pages/admin/components/UserCreateDialog.vue";
import { baseApi } from "@/shared/api/baseApi";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { openDialog } from "@/shared/lib/dialog/dialog";
import { openConfirm } from "@/shared/lib/dialog/openConfirm";
import { roleLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseIconButton from "@/shared/ui/button/BaseIconButton.vue";
import BasePage from "@/shared/ui/page/BasePage.vue";
import BaseTable from "@/shared/ui/table/BaseTable.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";
import { useAuthStore } from "@/store/auth";

const authStore = useAuthStore();

const { state, isLoading, fetch } = useFetch(baseApi.users.getUsers, "data.items", {
	immediate: true,
	params: { perPage: 50 },
});

const handleOpenCreate = async () => {
	const created = await openDialog(UserCreateDialog);
	if (created) await fetch();
};

const columns = computed(() => [
	{ key: "fullName", label: translate("users.fullName") },
	{ key: "email", label: translate("users.email") },
	{ key: "role", label: translate("users.role") },
	{ key: "active", label: translate("users.active") },
	{ key: "actions", label: "", width: "72px", sortable: false },
]);

const handleToggleActive = async (id: string, isActive: boolean) => {
	const confirmed = await openConfirm({
		title: translate(isActive ? "users.blockUser" : "users.unblockUser"),
	});
	if (!confirmed) return;
	await baseApi.users.updateUser({ id }, undefined, { isActive: !isActive });
	await fetch();
};
</script>

<template>
	<base-page :title="translate('users.title')">
		<template v-if="authStore.hasPermission('USERS_CREATE')" #actions>
			<base-button type="primary" @click="handleOpenCreate">{{ translate("users.create") }}</base-button>
		</template>
		<base-table code="users" :rows="state || []" :columns="columns" :loading="isLoading">
			<template #fullName="{ row }">
				<base-user-name :user="row" />
			</template>
			<template #role="{ row }">{{ roleLabel(row.systemRole) }}</template>
			<template #active="{ row }">
				{{ row.isActive ? translate("users.active") : translate("users.blocked") }}
			</template>
			<template #actions="{ row }">
				<base-icon-button
					v-if="authStore.hasPermission('USERS_BLOCK')"
					:label="row.isActive ? translate('users.block') : translate('users.unblock')"
					:danger="row.isActive"
					@click="() => handleToggleActive(row.id, row.isActive)"
				>
					<el-icon :size="16">
						<lock v-if="row.isActive" />
						<unlock v-else />
					</el-icon>
				</base-icon-button>
			</template>
		</base-table>
	</base-page>
</template>
