<script lang="ts" setup>
import { Search } from "@/shared/ui/icon/icons";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { SETTINGS_SECTIONS, type SettingsGroup } from "@/pages/settings/settingsSections";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BasePage from "@/shared/ui/page/BasePage.vue";
import { useAuthStore } from "@/store/auth";
import { useLocaleStore } from "@/store/locale";

/**
 * Настройки в духе Jira, Asana и Linear: слева меню из двух групп («Личные» и «Система»),
 * справа выбранный раздел. У каждого раздела свой адрес: /settings/<раздел>.
 */
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const localeStore = useLocaleStore();
const search = ref("");

const GROUPS: SettingsGroup[] = ["personal", "system"];

const available = computed(() => {
	void localeStore.locale; // пересчитать подписи при смене языка
	return SETTINGS_SECTIONS.filter((item) => !item.permission || authStore.hasPermission(item.permission)).map(
		(item) => ({
			...item,
			title: translate(`settings.sections.${item.id}.title`),
			description: translate(`settings.sections.${item.id}.description`),
		}),
	);
});

const visible = computed(() => {
	const query = search.value.trim().toLowerCase();
	if (!query) return available.value;
	return available.value.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query));
});

const groups = computed(() =>
	GROUPS.map((group) => ({ group, items: visible.value.filter((item) => item.group === group) })).filter(
		(entry) => entry.items.length,
	),
);

const currentId = computed(() => (typeof route.params.section === "string" ? route.params.section : ""));
const current = computed(() => available.value.find((item) => item.id === currentId.value));

// Без раздела в адресе или с недоступным разделом — открываем первый доступный
watch(
	[currentId, available],
	() => {
		if (route.name !== "settings") return;
		if (!current.value && available.value.length) {
			router.replace({ name: "settings", params: { section: available.value[0].id } });
		}
	},
	{ immediate: true },
);

const handleOpen = (id: string) => router.push({ name: "settings", params: { section: id } });
</script>

<template>
	<base-page class="settings-page" :title="translate('settings.title')">
		<div class="settings-page__layout">
			<nav class="settings-page__nav" :aria-label="translate('settings.title')">
				<el-input
					v-model="search"
					class="settings-page__search"
					:placeholder="translate('common.search')"
					:prefix-icon="Search"
					clearable
				/>
				<p v-if="!groups.length" class="settings-page__empty">{{ translate("settings.noResults") }}</p>
				<section v-for="entry in groups" :key="entry.group" class="settings-page__group">
					<h2 class="settings-page__group-title">{{ translate(`settings.groups.${entry.group}`) }}</h2>
					<button
						v-for="item in entry.items"
						:key="item.id"
						type="button"
						class="settings-page__link"
						:class="{ 'is-active': item.id === current?.id }"
						:aria-current="item.id === current?.id ? 'page' : undefined"
						@click="() => handleOpen(item.id)"
					>
						<el-icon :size="16" aria-hidden="true"><component :is="item.icon" /></el-icon>
						<span>{{ item.title }}</span>
					</button>
				</section>
			</nav>

			<main v-if="current" class="settings-page__content">
				<header class="settings-page__header">
					<h2>{{ current.title }}</h2>
					<p>{{ current.description }}</p>
				</header>
				<component :is="current.component" :key="current.id" />
			</main>
		</div>
	</base-page>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-page {
	&__layout {
		display: grid;
		grid-template-columns: 240px minmax(0, 1fr);
		align-items: start;
		gap: map.get($spacers, 6);
	}

	&__nav {
		position: sticky;
		top: map.get($spacers, 4);
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 4);
	}

	&__search :deep(.el-input__wrapper) {
		border-radius: 99px;
	}

	&__empty {
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 7);
	}

	&__group {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	&__group-title {
		margin: 0 0 map.get($spacers, 1);
		padding: 0 map.get($spacers, 3);
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 8);
		font-weight: 650;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	&__link {
		display: flex;
		align-items: center;
		gap: map.get($spacers, 3);
		width: 100%;
		padding: map.get($spacers, 2) map.get($spacers, 3);
		border: 0;
		border-radius: var(--mt-radius-sm);
		background: transparent;
		color: var(--mt-color-gray-600);
		font: inherit;
		font-size: map.get($font-sizes, 6);
		text-align: left;
		cursor: pointer;

		&:hover {
			background: var(--mt-color-gray-50);
			color: var(--mt-color-text);
		}

		&.is-active {
			background: var(--mt-color-primary-light);
			color: var(--mt-color-primary);
			font-weight: 600;
		}
	}

	&__content {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 5);
		min-width: 0;
	}

	&__header {
		h2 {
			margin: 0;
			font-size: map.get($font-sizes, 3);
		}

		p {
			margin: map.get($spacers, 1) 0 0;
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 7);
		}
	}

	@media (max-width: 900px) {
		&__layout {
			grid-template-columns: minmax(0, 1fr);
		}

		&__nav {
			position: static;
		}
	}
}
</style>
