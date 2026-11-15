<script lang="ts" setup>
import { ElMessage } from "element-plus";
import { computed, reactive, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import { openConfirm } from "@/shared/lib/dialog/openConfirm";
import { JwtService } from "@/shared/lib/services/JwtService";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import { useAuthStore } from "@/store/auth";

/** Аккаунт: смена пароля и выход на всех устройствах. После обоих действий эта сессия продолжается */
const authStore = useAuthStore();

const form = reactive({ current: "", next: "", repeat: "" });
const isSaving = ref(false);
const isLoggingOut = ref(false);

/** Те же правила, что при регистрации и на сервере */
const rules = computed(() => [
	{ ok: form.next.length >= 8, text: translate("settings.account.ruleLength") },
	{ ok: /[A-Za-zА-Яа-я]/.test(form.next), text: translate("settings.account.ruleLetter") },
	{ ok: /\d/.test(form.next), text: translate("settings.account.ruleDigit") },
]);
const mismatch = computed(() => Boolean(form.repeat) && form.repeat !== form.next);
const canSubmit = computed(
	() => Boolean(form.current) && rules.value.every((rule) => rule.ok) && form.repeat === form.next,
);

const handleChangePassword = async () => {
	if (!canSubmit.value) return;
	isSaving.value = true;
	try {
		const response = await baseApi.auth.changePassword(undefined, undefined, {
			currentPassword: form.current,
			newPassword: form.next,
		});
		if (response.data?.data) JwtService.saveTokens(response.data.data);
		Object.assign(form, { current: "", next: "", repeat: "" });
		ElMessage({ type: "success", message: translate("settings.account.passwordChanged") });
	} finally {
		isSaving.value = false;
	}
};

const handleLogoutAll = async () => {
	const confirmed = await openConfirm({
		title: translate("settings.account.logoutAll"),
		text: translate("settings.account.logoutAllText"),
		confirmLabel: translate("settings.account.logoutAllConfirm"),
	});
	if (!confirmed) return;
	isLoggingOut.value = true;
	try {
		const response = await baseApi.auth.logoutAll();
		if (response.data?.data) JwtService.saveTokens(response.data.data);
		ElMessage({ type: "success", message: translate("settings.account.loggedOutAll") });
	} finally {
		isLoggingOut.value = false;
	}
};
</script>

<template>
	<base-flex direction="column" :gap="5">
		<base-card class="settings-card">
			<h3>{{ translate("settings.account.passwordTitle") }}</h3>
			<p class="settings-card__hint">{{ translate("settings.account.passwordHint") }}</p>
			<el-form label-position="top" class="settings-account__form" @submit.prevent="handleChangePassword">
				<input
					class="settings-account__username"
					type="email"
					name="username"
					autocomplete="username"
					:value="authStore.user?.email"
					readonly
					tabindex="-1"
					aria-hidden="true"
				/>
				<el-form-item :label="translate('settings.account.current')">
					<el-input v-model="form.current" type="password" show-password autocomplete="current-password" />
				</el-form-item>
				<el-form-item :label="translate('settings.account.next')">
					<el-input v-model="form.next" type="password" show-password autocomplete="new-password" />
				</el-form-item>
				<ul class="settings-account__rules">
					<li v-for="rule in rules" :key="rule.text" :class="{ 'is-ok': rule.ok }">{{ rule.text }}</li>
				</ul>
				<el-form-item
					:label="translate('settings.account.repeat')"
					:error="mismatch ? translate('settings.account.mismatch') : ''"
				>
					<el-input v-model="form.repeat" type="password" show-password autocomplete="new-password" />
				</el-form-item>
				<base-button type="primary" native-type="submit" :loading="isSaving" :disabled="!canSubmit">
					{{ translate("settings.account.change") }}
				</base-button>
			</el-form>
		</base-card>

		<base-card class="settings-card">
			<h3>{{ translate("settings.account.sessionsTitle") }}</h3>
			<p class="settings-card__hint">{{ translate("settings.account.sessionsHint") }}</p>
			<base-button type="danger" plain :loading="isLoggingOut" @click="handleLogoutAll">
				{{ translate("settings.account.logoutAll") }}
			</base-button>
		</base-card>

		<base-card class="settings-card">
			<h3>{{ translate("settings.account.profileTitle") }}</h3>
			<p class="settings-card__hint">{{ translate("settings.account.profileHint") }}</p>
			<router-link class="settings-account__link" :to="{ name: 'profile' }">
				{{ translate("settings.account.openProfile") }}
			</router-link>
		</base-card>
	</base-flex>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-card {
	max-width: 640px;
	padding: map.get($spacers, 5) map.get($spacers, 6);

	h3 {
		margin: 0;
		font-size: map.get($font-sizes, 5);
	}

	&__hint {
		margin: map.get($spacers, 1) 0 map.get($spacers, 4);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 7);
	}
}

.settings-account {
	&__form {
		max-width: 360px;
	}

	/* Поле для менеджеров паролей: браузер должен знать, к какому логину относится пароль */
	&__username {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	&__rules {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: -#{map.get($spacers, 2)} 0 map.get($spacers, 4);
		padding-left: map.get($spacers, 4);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);

		.is-ok {
			color: var(--mt-color-success);
		}
	}

	&__link {
		color: var(--mt-color-primary);
		font-weight: 600;
		text-decoration: none;
	}
}
</style>
