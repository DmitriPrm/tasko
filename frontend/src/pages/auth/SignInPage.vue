<script lang="ts" setup>
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import AuthShell from "@/pages/auth/components/AuthShell.vue";
import { translate } from "@/shared/lib/theming/i18n/translate";
import { useAuthStore } from "@/store/auth";
import { useUserSettingsStore } from "@/store/userSettings";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const userSettings = useUserSettingsStore();
const isSubmitting = ref(false);
const form = reactive({
	email: import.meta.env.DEV ? "manager@tasko.local" : "",
	password: import.meta.env.DEV ? "Password123!" : "",
});

/** Возвращаем туда, откуда пришли (например, на приглашение), но только внутри приложения */
const redirectTarget = () => {
	const target = route.query.redirect;
	return typeof target === "string" && target.startsWith("/") && !target.startsWith("//") ? target : "/";
};

const handleSubmit = async () => {
	if (isSubmitting.value) return;
	isSubmitting.value = true;
	try {
		await authStore.login({ email: form.email.trim(), password: form.password });
		const target = redirectTarget();
		const startPage = userSettings.preferences?.startPage;
		await router.push(target === "/" && startPage ? { name: startPage } : target);
	} catch {
		// Сообщение об ошибке показывает перехватчик API
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<auth-shell :eyebrow="translate('auth.welcome')" :title="translate('auth.title')">
		<el-form class="auth-shell__form" label-position="top" @submit.prevent="handleSubmit">
			<el-form-item :label="translate('auth.email')">
				<el-input v-model="form.email" size="large" autocomplete="username" />
			</el-form-item>
			<el-form-item :label="translate('auth.password')">
				<el-input v-model="form.password" type="password" show-password size="large" autocomplete="current-password" />
			</el-form-item>
			<router-link class="sign-in__forgot" :to="{ name: 'forgot-password' }">{{
				translate("auth.forgotLink")
			}}</router-link>
			<base-button class="auth-shell__submit" type="primary" native-type="submit" :loading="isSubmitting">
				{{ translate("auth.submit") }}
			</base-button>
		</el-form>
		<p class="auth-shell__footer">
			{{ translate("auth.noAccount") }}
			<router-link :to="{ name: 'register', query: route.query }">{{ translate("auth.createAccount") }}</router-link>
		</p>
	</auth-shell>
</template>

<style scoped lang="scss">
.sign-in__forgot {
	display: inline-block;
	margin: -8px 0 16px;
	color: var(--mt-color-primary);
	font-size: 0.8125rem;
	font-weight: 600;
	text-decoration: none;
}
</style>
