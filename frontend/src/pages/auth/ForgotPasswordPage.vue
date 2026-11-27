<script lang="ts" setup>
import { ref } from "vue";

import AuthShell from "@/pages/auth/components/AuthShell.vue";
import { baseApi } from "@/shared/api/baseApi";
import { translate } from "@/shared/lib/theming/i18n/translate";

/**
 * «Забыли пароль?». Ответ всегда одинаковый — по нему нельзя узнать, зарегистрирован ли адрес.
 */
const email = ref("");
const isSubmitting = ref(false);
const isSent = ref(false);

const handleSubmit = async () => {
	if (isSubmitting.value || !email.value.trim()) return;
	isSubmitting.value = true;
	try {
		await baseApi.auth.forgotPassword(undefined, undefined, { email: email.value.trim() });
		isSent.value = true;
	} catch {
		// Сообщение об ошибке показывает перехватчик API
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<auth-shell :eyebrow="translate('auth.forgotEyebrow')" :title="translate('auth.forgotTitle')">
		<template v-if="isSent">
			<p class="auth-shell__notice">{{ translate("auth.forgotSent") }}</p>
			<router-link class="auth-shell__link" :to="{ name: 'sign-in' }"
				>← {{ translate("auth.backToLogin") }}</router-link
			>
		</template>
		<template v-else>
			<p class="auth-shell__notice">{{ translate("auth.forgotHint") }}</p>
			<el-form class="auth-shell__form" label-position="top" @submit.prevent="handleSubmit">
				<el-form-item :label="translate('auth.email')">
					<el-input v-model="email" size="large" type="email" autocomplete="email" />
				</el-form-item>
				<base-button
					class="auth-shell__submit"
					type="primary"
					native-type="submit"
					:loading="isSubmitting"
					:disabled="!email.trim()"
				>
					{{ translate("auth.forgotSubmit") }}
				</base-button>
			</el-form>
			<p class="auth-shell__footer">
				<router-link :to="{ name: 'sign-in' }">← {{ translate("auth.backToLogin") }}</router-link>
			</p>
		</template>
	</auth-shell>
</template>
