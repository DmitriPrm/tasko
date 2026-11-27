<script lang="ts" setup>
import { ElMessage } from "element-plus";
import { ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import { translate } from "@/shared/lib/theming/i18n/translate";
import { useAuthStore } from "@/store/auth";

const authStore = useAuthStore();
const isSending = ref(false);
const isSent = ref(false);

const handleResend = async () => {
	isSending.value = true;
	try {
		const { data } = await baseApi.auth.resendVerification();
		if (data.data.alreadyVerified) {
			await authStore.refreshUser();
			return;
		}
		isSent.value = true;
		ElMessage[data.data.sent ? "success" : "warning"](
			translate(data.data.sent ? "auth.verificationSent" : "auth.verificationNotSent"),
		);
	} catch {
		// Сообщение об ошибке показывает перехватчик API
	} finally {
		isSending.value = false;
	}
};
</script>

<template>
	<div v-if="authStore.user && !authStore.isEmailVerified" class="email-verify-banner" role="status">
		<span
			>{{ translate("auth.verifyBanner") }} <strong>{{ authStore.user.email }}</strong></span
		>
		<base-button size="small" :loading="isSending" :disabled="isSent" @click="handleResend">
			{{ isSent ? translate("auth.verificationResent") : translate("auth.resend") }}
		</base-button>
	</div>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.email-verify-banner {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: map.get($spacers, 3);
	margin-bottom: map.get($spacers, 4);
	padding: map.get($spacers, 3) map.get($spacers, 4);
	border-radius: var(--mt-radius);
	background: var(--mt-color-warning-light);
	color: var(--mt-color-text);
	font-size: map.get($font-sizes, 6);
}
</style>
