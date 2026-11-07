<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import AuthShell from "@/pages/auth/components/AuthShell.vue";
import { baseApi } from "@/shared/api/baseApi";
import { translate } from "@/shared/lib/theming/i18n/translate";
import { useAuthStore } from "@/store/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const state = ref<"loading" | "success" | "error">("loading");

onMounted(async () => {
	try {
		await baseApi.auth.verifyEmail(undefined, undefined, { token: String(route.params.token) });
		state.value = "success";
		if (authStore.isAuthenticated) await authStore.refreshUser().catch(() => false);
	} catch {
		state.value = "error";
	}
});

const handleContinue = () => router.push(authStore.isAuthenticated ? "/" : { name: "sign-in" });
</script>

<template>
	<auth-shell :title="translate('auth.verifyTitle')">
		<el-skeleton v-if="state === 'loading'" class="auth-shell__form" :rows="2" animated />
		<template v-else>
			<p class="auth-shell__notice">
				{{ state === "success" ? translate("auth.verifySuccess") : translate("auth.verifyError") }}
			</p>
			<base-button class="auth-shell__submit" type="primary" @click="handleContinue">
				{{ authStore.isAuthenticated ? translate("auth.toApp") : translate("auth.submit") }}
			</base-button>
		</template>
	</auth-shell>
</template>
