<script lang="ts" setup>
import { computed, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import AuthShell from "@/pages/auth/components/AuthShell.vue";
import { baseApi } from "@/shared/api/baseApi";
import { translate } from "@/shared/lib/theming/i18n/translate";
import { useAuthStore } from "@/store/auth";

/** Новый пароль по ссылке из письма. После сброса все сессии завершаются — входим заново */
const route = useRoute();
const authStore = useAuthStore();
const form = reactive({ password: "", repeat: "" });
const isSubmitting = ref(false);
const state = ref<"form" | "done" | "invalid">("form");

/** Те же правила, что при регистрации и на сервере */
const rules = computed(() => [
	{ ok: form.password.length >= 8, text: translate("settings.account.ruleLength") },
	{ ok: /[A-Za-zА-Яа-я]/.test(form.password), text: translate("settings.account.ruleLetter") },
	{ ok: /\d/.test(form.password), text: translate("settings.account.ruleDigit") },
]);
const mismatch = computed(() => Boolean(form.repeat) && form.repeat !== form.password);
const canSubmit = computed(() => rules.value.every((rule) => rule.ok) && form.repeat === form.password);

const handleSubmit = async () => {
	if (!canSubmit.value || isSubmitting.value) return;
	isSubmitting.value = true;
	try {
		await baseApi.auth.resetPassword(undefined, undefined, {
			token: String(route.params.token),
			newPassword: form.password,
		});
		// Сессии в этом браузере тоже отозваны
		authStore.logout();
		state.value = "done";
	} catch {
		state.value = "invalid";
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<auth-shell :eyebrow="translate('auth.forgotEyebrow')" :title="translate('auth.resetTitle')">
		<template v-if="state === 'done'">
			<p class="auth-shell__notice">{{ translate("auth.resetDone") }}</p>
			<router-link :to="{ name: 'sign-in' }">
				<base-button class="auth-shell__submit" type="primary">{{ translate("auth.submit") }}</base-button>
			</router-link>
		</template>
		<template v-else-if="state === 'invalid'">
			<p class="auth-shell__notice">{{ translate("auth.resetInvalid") }}</p>
			<router-link :to="{ name: 'forgot-password' }">{{ translate("auth.resetAgain") }}</router-link>
		</template>
		<el-form v-else class="auth-shell__form" label-position="top" @submit.prevent="handleSubmit">
			<el-form-item :label="translate('settings.account.next')">
				<el-input v-model="form.password" type="password" show-password size="large" autocomplete="new-password" />
			</el-form-item>
			<ul class="reset-password__rules">
				<li v-for="rule in rules" :key="rule.text" :class="{ 'is-ok': rule.ok }">{{ rule.text }}</li>
			</ul>
			<el-form-item
				:label="translate('settings.account.repeat')"
				:error="mismatch ? translate('settings.account.mismatch') : ''"
			>
				<el-input v-model="form.repeat" type="password" show-password size="large" autocomplete="new-password" />
			</el-form-item>
			<base-button
				class="auth-shell__submit"
				type="primary"
				native-type="submit"
				:loading="isSubmitting"
				:disabled="!canSubmit"
			>
				{{ translate("auth.resetSubmit") }}
			</base-button>
		</el-form>
	</auth-shell>
</template>

<style scoped lang="scss">
.reset-password__rules {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin: -8px 0 16px;
	padding-left: 18px;
	color: var(--mt-color-gray-500);
	font-size: 0.75rem;

	.is-ok {
		color: var(--mt-color-success);
	}
}
</style>
