<script lang="ts" setup>
import { ElMessage } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import AuthShell from "@/pages/auth/components/AuthShell.vue";
import { baseApi } from "@/shared/api/baseApi";
import { translate } from "@/shared/lib/theming/i18n/translate";
import type { PublicSettings } from "@/shared/api/v0/schemas";
import { useAuthStore } from "@/store/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isSubmitting = ref(false);

/** Правила регистрации: публичные настройки доступны и до входа */
const registration = ref<PublicSettings["registration"] | null>(null);
onMounted(async () => {
	try {
		registration.value = (await baseApi.settings.getPublicSettings()).data?.data.registration ?? null;
	} catch {
		registration.value = null;
	}
});
/** Приглашённым правила не мешают — их пускает сервер */
const isClosed = computed(() => registration.value?.open === false && !inviteToken.value);
const domainsHint = computed(() =>
	registration.value?.allowedDomains.length && !inviteToken.value
		? registration.value.allowedDomains.map((item) => `@${item}`).join(", ")
		: "",
);
const form = reactive({ fullName: "", email: "", password: "", confirm: "" });

/** Токен приглашения приходит из ссылки /invite/:token через ?redirect=/invite/<token> */
const inviteToken = computed(() => {
	const redirect = route.query.redirect;
	const match = typeof redirect === "string" ? redirect.match(/^\/invite\/([A-Za-z0-9]+)$/) : null;
	return match?.[1] ?? "";
});

onMounted(async () => {
	if (!inviteToken.value) return;
	try {
		const { data } = await baseApi.invitations.getInvitationByToken({ token: inviteToken.value });
		form.email = data.data.email;
	} catch {
		// Недействительная ссылка: обычная регистрация
	}
});

const redirectTarget = () => {
	const target = route.query.redirect;
	return typeof target === "string" && target.startsWith("/") && !target.startsWith("//") ? target : "/";
};

const passwordError = computed(() => {
	if (!form.password) return "";
	if (form.password.length < 8) return translate("auth.passwordShort");
	if (!/[A-Za-zА-Яа-я]/.test(form.password) || !/\d/.test(form.password)) return translate("auth.passwordWeak");
	return "";
});
const confirmError = computed(() =>
	form.confirm && form.confirm !== form.password ? translate("auth.passwordMismatch") : "",
);
const canSubmit = computed(
	() =>
		form.fullName.trim().length >= 2 &&
		/^\S+@\S+\.\S+$/.test(form.email.trim()) &&
		form.password.length > 0 &&
		!passwordError.value &&
		form.confirm === form.password,
);

const handleSubmit = async () => {
	if (isSubmitting.value || !canSubmit.value) return;
	isSubmitting.value = true;
	try {
		const result = await authStore.register({
			fullName: form.fullName.trim(),
			email: form.email.trim(),
			password: form.password,
			inviteToken: inviteToken.value || undefined,
		});
		if (result.verificationSent) {
			ElMessage.success(translate("auth.verificationSent"));
		}
		if (result.joinedProjectId) {
			await router.push({ name: "project", params: { id: result.joinedProjectId } });
			return;
		}
		await router.push(redirectTarget());
	} catch {
		// Сообщение об ошибке показывает перехватчик API
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<auth-shell :eyebrow="translate('auth.registerEyebrow')" :title="translate('auth.registerTitle')">
		<el-alert
			v-if="isClosed"
			type="info"
			:title="translate('auth.registrationClosed')"
			:description="translate('auth.registrationClosedHint')"
			:closable="false"
			show-icon
		/>
		<el-form v-else class="auth-shell__form" label-position="top" @submit.prevent="handleSubmit">
			<el-form-item :label="translate('users.fullName')">
				<el-input v-model="form.fullName" size="large" autocomplete="name" maxlength="80" />
			</el-form-item>
			<el-form-item :label="translate('auth.email')">
				<el-input
					v-model="form.email"
					size="large"
					autocomplete="email"
					:readonly="Boolean(inviteToken && form.email)"
				/>
				<small v-if="domainsHint" class="register-page__domains"
					>{{ translate("auth.allowedDomains") }} {{ domainsHint }}</small
				>
			</el-form-item>
			<el-form-item :label="translate('auth.password')" :error="passwordError">
				<el-input
					v-model="form.password"
					type="password"
					show-password
					size="large"
					autocomplete="new-password"
					maxlength="72"
				/>
			</el-form-item>
			<el-form-item :label="translate('auth.confirmPassword')" :error="confirmError">
				<el-input
					v-model="form.confirm"
					type="password"
					show-password
					size="large"
					autocomplete="new-password"
					maxlength="72"
				/>
			</el-form-item>
			<base-button
				class="auth-shell__submit"
				type="primary"
				native-type="submit"
				:loading="isSubmitting"
				:disabled="!canSubmit"
			>
				{{ translate("auth.registerSubmit") }}
			</base-button>
		</el-form>
		<p class="auth-shell__footer">
			{{ translate("auth.haveAccount") }}
			<router-link :to="{ name: 'sign-in', query: route.query }">{{ translate("auth.submit") }}</router-link>
		</p>
	</auth-shell>
</template>

<style scoped lang="scss">
.register-page__domains {
	display: block;
	margin-top: 4px;
	color: var(--mt-color-gray-500);
	font-size: 0.75rem;
}
</style>
