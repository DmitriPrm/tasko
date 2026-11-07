<script lang="ts" setup>
import { ElMessageBox } from "element-plus";

import ProfileFieldDialog from "@/pages/profile/components/ProfileFieldDialog.vue";
import ProfileFieldText from "@/pages/profile/components/ProfileFieldText.vue";
import { baseApi } from "@/shared/api/baseApi";
import type { ProfileField, ProfileSection } from "@/shared/api/v0/schemas";
import { openDialog } from "@/shared/lib/dialog/dialog";
import { openConfirm } from "@/shared/lib/dialog/openConfirm";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseIconButton from "@/shared/ui/button/BaseIconButton.vue";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import { Delete, Edit, Plus } from "@/shared/ui/icon/icons";

const emit = defineEmits<{
	changed: [];
}>();

const props = defineProps<{
	userId: string;
	sections: ProfileSection[];
	editable?: boolean;
}>();

const askTitle = async (title: string, initial = "") => {
	try {
		const result = await ElMessageBox.prompt("", title, {
			inputValue: initial,
			inputPlaceholder: translate("profile.sectionName"),
			confirmButtonText: translate("common.save"),
			cancelButtonText: translate("common.cancel"),
			// В этой версии Element Plus у prompt нет inputAttrs, поэтому длину проверяем здесь
			inputValidator: (input: string) => input.trim().length > 0 && input.trim().length <= 80,
			inputErrorMessage: translate("settings.sectionEmpty"),
		});
		return result.value.trim();
	} catch {
		return null;
	}
};

const handleAddSection = async () => {
	const title = await askTitle(translate("profile.addSection"));
	if (!title) return;
	const { data } = await baseApi.users.createProfileSection({ userId: props.userId }, undefined, { title });
	emit("changed");
	// Сразу предлагаем добавить первое поле в новый раздел
	await handleAddField(data.data.id);
};

const handleRenameSection = async (section: ProfileSection) => {
	const title = await askTitle(translate("profile.renameSection"), section.title);
	if (!title || title === section.title) return;
	await baseApi.users.renameProfileSection({ userId: props.userId, sectionId: section.id }, undefined, { title });
	emit("changed");
};

const handleRemoveSection = async (section: ProfileSection) => {
	const confirmed = await openConfirm({
		title: translate("profile.deleteSection"),
		text: translate("profile.deleteSectionText"),
	});
	if (!confirmed) return;
	await baseApi.users.removeProfileSection({ userId: props.userId, sectionId: section.id });
	emit("changed");
};

const handleAddField = async (sectionId: string) => {
	const saved = await openDialog(ProfileFieldDialog, { userId: props.userId, sectionId });
	if (saved) emit("changed");
};

const handleEditField = async (field: ProfileField) => {
	const saved = await openDialog(ProfileFieldDialog, { userId: props.userId, field });
	if (saved) emit("changed");
};

const handleRemoveField = async (field: ProfileField) => {
	const confirmed = await openConfirm({ title: translate("profile.deleteField"), text: field.name });
	if (!confirmed) return;
	await baseApi.users.removeProfileField({ userId: props.userId, fieldId: field.id });
	emit("changed");
};
</script>

<template>
	<base-flex direction="column" :gap="5">
		<base-flex v-if="editable" justify="flex-end">
			<base-button type="primary" @click="handleAddSection">
				<el-icon :size="16"><plus /></el-icon>
				{{ translate("profile.addSection") }}
			</base-button>
		</base-flex>

		<el-empty
			v-if="!sections.length"
			:description="editable ? translate('profile.noSections') : translate('profile.noSectionsView')"
		/>

		<base-card v-for="section in sections" :key="section.id" class="profile-sections__card">
			<base-flex class="profile-sections__head" align="center" justify="space-between" :gap="3">
				<h3>{{ section.title }}</h3>
				<base-flex v-if="editable" :gap="1">
					<base-icon-button :label="translate('profile.addField')" @click="() => handleAddField(section.id)">
						<el-icon :size="16"><plus /></el-icon>
					</base-icon-button>
					<base-icon-button :label="translate('profile.renameSection')" @click="() => handleRenameSection(section)">
						<el-icon :size="16"><edit /></el-icon>
					</base-icon-button>
					<base-icon-button
						:label="translate('profile.deleteSection')"
						danger
						@click="() => handleRemoveSection(section)"
					>
						<el-icon :size="16"><delete /></el-icon>
					</base-icon-button>
				</base-flex>
			</base-flex>

			<ul v-if="section.fields.length" class="profile-sections__list">
				<li v-for="field in section.fields" :key="field.id" class="profile-sections__row">
					<span class="profile-sections__label">{{ field.name }}</span>
					<span class="profile-sections__value"><profile-field-text :field="field" /></span>
					<span v-if="editable" class="profile-sections__actions">
						<base-icon-button :label="translate('common.edit')" @click="() => handleEditField(field)">
							<el-icon :size="15"><edit /></el-icon>
						</base-icon-button>
						<base-icon-button :label="translate('common.delete')" danger @click="() => handleRemoveField(field)">
							<el-icon :size="15"><delete /></el-icon>
						</base-icon-button>
					</span>
				</li>
			</ul>
			<p v-else class="profile-sections__empty">{{ translate("profile.emptySection") }}</p>

			<base-button
				v-if="editable"
				class="profile-sections__add"
				text
				type="primary"
				@click="() => handleAddField(section.id)"
			>
				<el-icon :size="14"><plus /></el-icon>
				{{ translate("profile.addField") }}
			</base-button>
		</base-card>
	</base-flex>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.profile-sections {
	&__card {
		padding: map.get($spacers, 5) map.get($spacers, 6);
	}

	&__head h3 {
		margin: 0;
		font-size: map.get($font-sizes, 5);
	}

	&__list {
		margin: map.get($spacers, 3) 0 0;
		padding: 0;
		list-style: none;
	}

	&__row {
		display: grid;
		grid-template-columns: minmax(120px, 220px) minmax(0, 1fr) auto;
		align-items: center;
		gap: map.get($spacers, 4);
		padding: map.get($spacers, 3) 0;
		border-top: 1px solid var(--mt-color-gray-100);
		font-size: map.get($font-sizes, 6);

		&:first-child {
			border-top: 0;
		}

		@media (max-width: 640px) {
			grid-template-columns: minmax(0, 1fr) auto;

			.profile-sections__value {
				grid-column: 1 / -1;
				grid-row: 2;
			}
		}
	}

	&__label {
		color: var(--mt-color-gray-500);
	}

	&__value {
		min-width: 0;
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}

	&__actions {
		display: flex;
		gap: map.get($spacers, 1);
		opacity: 0.4;
		transition: opacity 0.15s var(--mt-ease);
	}

	&__row:hover &__actions,
	&__row:focus-within &__actions {
		opacity: 1;
	}

	&__empty {
		margin: map.get($spacers, 3) 0 0;
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 6);
	}

	&__add {
		margin-top: map.get($spacers, 2);
	}
}
</style>
