<script lang="ts" setup>
import { computed, ref } from "vue";

import { SECTION_ICON_KEYS, SECTION_ICONS, sectionIconKey } from "@/pages/profile/sectionIcons";
import { translate } from "@/shared/lib/theming/i18n/translate";

/** Иконка раздела профиля. Владелец нажимает на неё и выбирает другую из набора */
const emit = defineEmits<{
	change: [icon: string | null];
}>();

const props = defineProps<{
	title: string;
	icon?: string | null;
	editable?: boolean;
}>();

const isOpen = ref(false);
const current = computed(() => sectionIconKey({ title: props.title, icon: props.icon }));

const handlePick = (icon: string | null) => {
	isOpen.value = false;
	if (icon !== (props.icon ?? null)) emit("change", icon);
};
</script>

<template>
	<el-popover v-if="editable" v-model:visible="isOpen" trigger="click" placement="bottom-start" :width="232">
		<template #reference>
			<button
				type="button"
				class="profile-section-icon profile-section-icon--editable"
				:aria-label="translate('profile.sectionIcon')"
				:title="translate('profile.sectionIcon')"
			>
				<el-icon :size="18" aria-hidden="true"><component :is="SECTION_ICONS[current]" /></el-icon>
			</button>
		</template>
		<div class="profile-section-icon__picker">
			<strong>{{ translate("profile.sectionIcon") }}</strong>
			<div class="profile-section-icon__grid" role="listbox">
				<button
					v-for="key in SECTION_ICON_KEYS"
					:key="key"
					type="button"
					role="option"
					class="profile-section-icon__option"
					:class="{ 'is-active': current === key && icon === key }"
					:aria-selected="icon === key"
					:aria-label="translate(`profile.icons.${key}`)"
					:title="translate(`profile.icons.${key}`)"
					@click="() => handlePick(key)"
				>
					<el-icon :size="18" aria-hidden="true"><component :is="SECTION_ICONS[key]" /></el-icon>
				</button>
			</div>
			<base-button text type="primary" :disabled="!icon" @click="() => handlePick(null)">
				{{ translate("profile.iconAuto") }}
			</base-button>
		</div>
	</el-popover>
	<span v-else class="profile-section-icon" aria-hidden="true">
		<el-icon :size="18"><component :is="SECTION_ICONS[current]" /></el-icon>
	</span>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.profile-section-icon {
	display: inline-grid;
	flex-shrink: 0;
	place-items: center;
	width: 34px;
	height: 34px;
	padding: 0;
	border: 0;
	border-radius: 10px;
	background: var(--mt-color-primary-light);
	color: var(--mt-color-primary);

	&--editable {
		cursor: pointer;
		transition: box-shadow 0.15s var(--mt-ease);

		&:hover,
		&:focus-visible {
			box-shadow: 0 0 0 2px var(--mt-color-primary);
			outline: none;
		}
	}

	&__picker {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 3);
	}

	&__grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: map.get($spacers, 2);
	}

	&__option {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		padding: 0;
		border: 1px solid var(--mt-color-gray-200);
		border-radius: 8px;
		background: var(--mt-color-white);
		color: var(--mt-color-gray-600);
		cursor: pointer;

		&:hover,
		&:focus-visible {
			border-color: var(--mt-color-primary);
			color: var(--mt-color-primary);
			outline: none;
		}

		&.is-active {
			border-color: var(--mt-color-primary);
			background: var(--mt-color-primary-light);
			color: var(--mt-color-primary);
		}
	}
}
</style>
