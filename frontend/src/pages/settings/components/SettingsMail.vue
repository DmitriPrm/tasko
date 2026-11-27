<script lang="ts" setup>
import { ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";

/**
 * Почта: проверка, что письма уходят. Адрес сервера и пароль хранятся в .env бэкенда,
 * а не в базе — так пароль не попадает в интерфейс и резервные копии.
 */
const result = ref<{ configured: boolean; sent: boolean; to: string } | null>(null);
const isSending = ref(false);

const handleTest = async () => {
	isSending.value = true;
	try {
		result.value = (await baseApi.settings.testMail()).data?.data ?? null;
	} finally {
		isSending.value = false;
	}
};

const ENV = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"];
</script>

<template>
	<base-card class="settings-card">
		<h3>{{ translate("settings.mail.testTitle") }}</h3>
		<p class="settings-card__hint">{{ translate("settings.mail.testHint") }}</p>
		<base-button type="primary" :loading="isSending" @click="handleTest">{{
			translate("settings.mail.send")
		}}</base-button>
		<el-alert
			v-if="result"
			class="settings-mail__result"
			:type="!result.configured ? 'warning' : result.sent ? 'success' : 'error'"
			:title="
				!result.configured
					? translate('settings.mail.notConfigured')
					: result.sent
						? `${translate('settings.mail.sent')} ${result.to}`
						: translate('settings.mail.failed')
			"
			:closable="false"
			show-icon
		/>
		<h3 class="settings-mail__subtitle">{{ translate("settings.mail.envTitle") }}</h3>
		<p class="settings-card__hint">{{ translate("settings.mail.envHint") }}</p>
		<code class="settings-mail__env">{{ ENV.join("\n") }}</code>
	</base-card>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-card {
	max-width: 640px;
	padding: map.get($spacers, 6);

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

.settings-mail {
	&__result {
		margin-top: map.get($spacers, 4);
	}

	&__subtitle {
		margin-top: map.get($spacers, 6) !important;
	}

	&__env {
		display: block;
		padding: map.get($spacers, 3) map.get($spacers, 4);
		border-radius: var(--mt-radius-sm);
		background: var(--mt-color-gray-50);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: map.get($font-sizes, 8);
		white-space: pre;
	}
}
</style>
