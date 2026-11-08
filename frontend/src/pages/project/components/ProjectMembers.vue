<script lang="ts" setup>
import { ElMessage } from "element-plus";
import { computed, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { Invitation, ProjectMember } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { formatDate } from "@/shared/lib/helpers/formatDate";
import { openConfirm } from "@/shared/lib/dialog/openConfirm";
import { roleLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseIconButton from "@/shared/ui/button/BaseIconButton.vue";
import { Delete } from "@/shared/ui/icon/icons";
import BaseTable from "@/shared/ui/table/BaseTable.vue";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";

const emit = defineEmits<{
	changed: [];
}>();

const props = defineProps<{
	projectId: string;
	members: ProjectMember[];
	canManage?: boolean;
}>();

const email = ref("");
const selectedRole = ref<"MANAGER" | "MEMBER">("MEMBER");
const isInviting = ref(false);

const { state: invitationsState, fetch: fetchInvitations } = useFetch(
	baseApi.invitations.getProjectInvitations,
	"data",
	{
		immediate: Boolean(props.canManage),
		autoFetch: false,
		pathParams: computed(() => ({ id: props.projectId })),
	},
);
const invitations = computed(() => (invitationsState.value || []) as Invitation[]);

const isEmailValid = computed(() => /^\S+@\S+\.\S+$/.test(email.value.trim()));

const copyLink = async (url: string) => {
	try {
		await navigator.clipboard.writeText(url);
		ElMessage.success(translate("invitation.linkCopied"));
	} catch {
		ElMessage.info(url);
	}
};

const reportDelivery = async (result: { emailSent: boolean; inviteUrl: string }) => {
	if (result.emailSent) {
		ElMessage.success(translate("invitation.sent"));
		return;
	}
	// Письмо не ушло (SMTP недоступен): отдаём ссылку, чтобы передать её вручную
	ElMessage.warning(translate("invitation.notSent"));
	await copyLink(result.inviteUrl);
};

const handleInvite = async () => {
	if (!isEmailValid.value || isInviting.value) return;
	isInviting.value = true;
	try {
		const { data } = await baseApi.invitations.createProjectInvitation({ id: props.projectId }, undefined, {
			email: email.value.trim().toLowerCase(),
			projectRole: selectedRole.value,
		});
		email.value = "";
		await reportDelivery(data.data);
		await fetchInvitations();
	} catch {
		// Сообщение об ошибке показывает перехватчик API
	} finally {
		isInviting.value = false;
	}
};

const handleResend = async (invitation: Invitation) => {
	const { data } = await baseApi.invitations.resendProjectInvitation({
		id: props.projectId,
		invitationId: invitation.id,
	});
	await reportDelivery(data.data);
	await fetchInvitations();
};

const handleRevoke = async (invitation: Invitation) => {
	const confirmed = await openConfirm({ title: translate("invitation.revoke") });
	if (!confirmed) return;
	await baseApi.invitations.revokeProjectInvitation({ id: props.projectId, invitationId: invitation.id });
	await fetchInvitations();
};

const handleRemove = async (userId: string) => {
	const confirmed = await openConfirm({ title: translate("project.deleteMember") });
	if (!confirmed) return;
	await baseApi.projects.removeProjectMember({ id: props.projectId, userId });
	emit("changed");
};

const columns = computed(() => {
	const list: { key: string; label: string; sortKey?: string; sortable?: boolean }[] = [
		{ key: "name", label: translate("users.fullName"), sortKey: "user.fullName" },
		{ key: "role", label: translate("users.role"), sortKey: "projectRole" },
	];
	if (props.canManage) list.push({ key: "actions", label: "", sortable: false });
	return list;
});

const isExpired = (invitation: Invitation) => new Date(invitation.expiresAt).getTime() < Date.now();

const projectRoleLabel = (role: string) => (role === "MANAGER" ? roleLabel("PROJECT_MANAGER") : roleLabel("MEMBER"));
</script>

<template>
	<section class="project-members">
		<h3>{{ translate("project.members") }}</h3>
		<template v-if="canManage">
			<el-form class="project-members__form" @submit.prevent="handleInvite">
				<base-flex :gap="3" wrap="wrap">
					<el-input
						v-model="email"
						class="project-members__email"
						type="email"
						autocomplete="off"
						:placeholder="translate('invitation.emailPlaceholder')"
					/>
					<el-select v-model="selectedRole" class="project-members__role">
						<el-option :label="roleLabel('PROJECT_MANAGER')" value="MANAGER" />
						<el-option :label="roleLabel('MEMBER')" value="MEMBER" />
					</el-select>
					<base-button type="primary" native-type="submit" :loading="isInviting" :disabled="!isEmailValid">
						{{ translate("invitation.invite") }}
					</base-button>
				</base-flex>
				<p class="project-members__hint">{{ translate("invitation.hint") }}</p>
			</el-form>

			<div v-if="invitations.length" class="project-members__pending">
				<h4>{{ translate("invitation.pending") }}</h4>
				<ul>
					<li v-for="invitation in invitations" :key="invitation.id">
						<span class="project-members__pending-main">
							<strong>{{ invitation.email }}</strong>
							<span>
								{{ projectRoleLabel(invitation.projectRole) }} · {{ translate("invitation.until") }}
								{{ formatDate(invitation.expiresAt) }}
								<template v-if="isExpired(invitation)"> · {{ translate("invitation.expired") }}</template>
							</span>
						</span>
						<base-button text @click="() => handleResend(invitation)">{{ translate("invitation.resend") }}</base-button>
						<base-icon-button :label="translate('invitation.revoke')" danger @click="() => handleRevoke(invitation)">
							<el-icon :size="16"><delete /></el-icon>
						</base-icon-button>
					</li>
				</ul>
			</div>
		</template>

		<base-table code="project-members" :rows="members" :columns="columns">
			<template #name="{ row }">
				<base-user-name :user="row.user" />
			</template>
			<template #role="{ row }">
				{{ projectRoleLabel(row.projectRole) }}
			</template>
			<template #actions="{ row }">
				<base-icon-button :label="translate('common.delete')" danger @click="() => handleRemove(row.userId)">
					<el-icon :size="16"><delete /></el-icon>
				</base-icon-button>
			</template>
		</base-table>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.project-members {
	h3 {
		margin: 0 0 map.get($spacers, 5);
		font-size: map.get($font-sizes, 5);
	}

	h4 {
		margin: 0 0 map.get($spacers, 3);
		font-size: map.get($font-sizes, 6);
		color: var(--mt-color-gray-500);
	}

	&__form {
		margin-bottom: map.get($spacers, 5);
	}

	&__email {
		flex: 2 1 260px;
		width: auto;
	}

	&__role {
		flex: 1 1 180px;
		width: auto;
	}

	&__hint {
		margin: map.get($spacers, 2) 0 0;
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 7);
	}

	&__pending {
		margin-bottom: map.get($spacers, 5);
		padding: map.get($spacers, 4);
		border-radius: var(--mt-radius);
		background: var(--mt-color-gray-50);

		ul {
			display: flex;
			flex-direction: column;
			gap: map.get($spacers, 2);
			margin: 0;
			padding: 0;
			list-style: none;
		}

		li {
			display: flex;
			align-items: center;
			gap: map.get($spacers, 3);
		}
	}

	&__pending-main {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		font-size: map.get($font-sizes, 6);
		overflow-wrap: anywhere;

		span {
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 7);
		}
	}
}
</style>
