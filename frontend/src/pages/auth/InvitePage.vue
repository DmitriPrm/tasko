<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import AuthShell from "@/pages/auth/components/AuthShell.vue";
import { baseApi } from "@/shared/api/baseApi";
import type { InvitationPreview } from "@/shared/api/v0/schemas";
import { roleLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import { useAuthStore } from "@/store/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = computed(() => String(route.params.token));
const redirect = computed(() => `/invite/${token.value}`);
const invitation = ref<InvitationPreview | null>(null);
const isLoading = ref(true);
const hasError = ref(false);
const isBusy = ref(false);

onMounted(async () => {
	try {
		const { data } = await baseApi.invitations.getInvitationByToken({ token: token.value });
		invitation.value = data.data;
	} catch {
		hasError.value = true;
	} finally {
		isLoading.value = false;
	}
});

const isPending = computed(() => invitation.value?.status === "PENDING");
const isAddressee = computed(() => authStore.user?.email.toLowerCase() === invitation.value?.email.toLowerCase());
const statusText = computed(() => {
	const status = invitation.value?.status;
	if (status === "EXPIRED") return translate("invitation.expired");
	if (status === "ACCEPTED") return translate("invitation.alreadyAccepted");
	if (status === "DECLINED" || status === "REVOKED") return translate("invitation.closed");
	return "";
});

const handleAccept = async () => {
	isBusy.value = true;
	try {
		const { data } = await baseApi.invitations.acceptInvitationByToken({ token: token.value });
		await router.push({ name: "project", params: { id: data.data.projectId } });
	} catch {
		// Сообщение об ошибке показывает перехватчик API
	} finally {
		isBusy.value = false;
	}
};

const handleDecline = async () => {
	isBusy.value = true;
	try {
		await baseApi.invitations.declineInvitationByToken({ token: token.value });
		await router.push("/");
	} catch {
		// Сообщение об ошибке показывает перехватчик API
	} finally {
		isBusy.value = false;
	}
};

const handleLogout = async () => {
	authStore.logout();
	await router.push({ name: "sign-in", query: { redirect: redirect.value } });
};
</script>

<template>
	<auth-shell :eyebrow="translate('invitation.eyebrow')" :title="translate('invitation.title')">
		<el-skeleton v-if="isLoading" class="auth-shell__form" :rows="3" animated />
		<p v-else-if="hasError || !invitation" class="auth-shell__notice">{{ translate("invitation.notFound") }}</p>
		<template v-else>
			<p class="auth-shell__notice">
				<strong>{{ invitation.invitedBy.fullName }}</strong>
				{{ translate("invitation.invites") }}
				<strong>«{{ invitation.project.name }}»</strong>
				({{ invitation.projectRole === "MANAGER" ? roleLabel("PROJECT_MANAGER") : roleLabel("MEMBER") }}).
				<br />
				{{ translate("invitation.sentTo") }} <strong>{{ invitation.email }}</strong>
			</p>

			<p v-if="!isPending" class="auth-shell__footer">{{ statusText }}</p>

			<template v-else-if="!authStore.isAuthenticated">
				<base-flex class="auth-shell__form" direction="column" :gap="3">
					<router-link
						v-slot="{ navigate }"
						:to="{ name: invitation.userExists ? 'sign-in' : 'register', query: { redirect } }"
						custom
					>
						<base-button class="auth-shell__submit" type="primary" @click="navigate">
							{{ invitation.userExists ? translate("invitation.signIn") : translate("invitation.register") }}
						</base-button>
					</router-link>
					<router-link
						:to="{ name: invitation.userExists ? 'register' : 'sign-in', query: { redirect } }"
						class="auth-shell__footer"
					>
						{{ invitation.userExists ? translate("auth.createAccount") : translate("invitation.haveAccount") }}
					</router-link>
				</base-flex>
			</template>

			<template v-else-if="!isAddressee">
				<p class="auth-shell__footer">
					{{ translate("invitation.wrongAccount") }} <strong>{{ authStore.user?.email }}</strong
					>.
				</p>
				<base-button class="auth-shell__submit" type="primary" @click="handleLogout">
					{{ translate("invitation.switchAccount") }}
				</base-button>
			</template>

			<template v-else-if="!authStore.isEmailVerified">
				<p class="auth-shell__footer">{{ translate("invitation.verifyFirst") }}</p>
			</template>

			<base-flex v-else class="auth-shell__form" direction="column" :gap="3">
				<base-button class="auth-shell__submit" type="primary" :loading="isBusy" @click="handleAccept">
					{{ translate("invitation.accept") }}
				</base-button>
				<base-button class="auth-shell__submit" :disabled="isBusy" @click="handleDecline">
					{{ translate("invitation.decline") }}
				</base-button>
			</base-flex>
		</template>
	</auth-shell>
</template>
