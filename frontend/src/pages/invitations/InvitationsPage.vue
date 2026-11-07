<script lang="ts" setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

import { baseApi } from "@/shared/api/baseApi";
import type { Invitation } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { formatDate } from "@/shared/lib/helpers/formatDate";
import { roleLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import BasePage from "@/shared/ui/page/BasePage.vue";
import { useAuthStore } from "@/store/auth";

const router = useRouter();
const authStore = useAuthStore();

const { state, isLoading, fetch } = useFetch(baseApi.invitations.getMyInvitations, "data", { immediate: true });
const invitations = computed(() => (state.value || []) as Invitation[]);

const handleAccept = async (invitation: Invitation) => {
	const { data } = await baseApi.invitations.acceptInvitation({ invitationId: invitation.id });
	await router.push({ name: "project", params: { id: data.data.projectId } });
};

const handleDecline = async (invitation: Invitation) => {
	await baseApi.invitations.declineInvitation({ invitationId: invitation.id });
	await fetch();
};
</script>

<template>
	<base-page :title="translate('invitation.mineTitle')">
		<el-skeleton :loading="isLoading && !state" animated>
			<el-alert
				v-if="!authStore.isEmailVerified"
				type="warning"
				:closable="false"
				show-icon
				:title="translate('invitation.verifyFirst')"
			/>
			<el-empty v-else-if="!invitations.length" :description="translate('invitation.mineEmpty')" />
			<base-flex v-else direction="column" :gap="4">
				<base-card v-for="invitation in invitations" :key="invitation.id" class="invitations-page__item">
					<base-flex align="center" justify="space-between" :gap="4" wrap="wrap">
						<div class="invitations-page__info">
							<strong>{{ invitation.project.name }}</strong>
							<span>
								{{ invitation.invitedBy.fullName }} ·
								{{ invitation.projectRole === "MANAGER" ? roleLabel("PROJECT_MANAGER") : roleLabel("MEMBER") }} ·
								{{ translate("invitation.until") }} {{ formatDate(invitation.expiresAt) }}
							</span>
						</div>
						<base-flex :gap="3">
							<base-button type="primary" @click="() => handleAccept(invitation)">
								{{ translate("invitation.accept") }}
							</base-button>
							<base-button @click="() => handleDecline(invitation)">{{ translate("invitation.decline") }}</base-button>
						</base-flex>
					</base-flex>
				</base-card>
			</base-flex>
		</el-skeleton>
	</base-page>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.invitations-page {
	&__item {
		padding: map.get($spacers, 5);
	}

	&__info {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 1);
		min-width: 0;

		strong {
			font-size: map.get($font-sizes, 5);
		}

		span {
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 7);
		}
	}
}
</style>
