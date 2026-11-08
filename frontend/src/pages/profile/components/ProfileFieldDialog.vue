<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import ProfileFieldControl from "@/pages/profile/components/ProfileFieldControl.vue";
import { baseApi } from "@/shared/api/baseApi";
import type { ProfileField, ProfileFieldType } from "@/shared/api/v0/schemas";
import { FIELD_TYPES } from "@/shared/lib/access/permissions";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseFormActions from "@/shared/ui/form/BaseFormActions.vue";

const emit = defineEmits<{
	resolve: [value: true];
	cancel: [];
}>();

const props = defineProps<{
	userId: string;
	/** Раздел, в который добавляется новое поле */
	sectionId?: string;
	/** Редактируемое поле; без него создаётся новое */
	field?: ProfileField;
}>();

const visible = ref(true);
const isSaving = ref(false);
const name = ref(props.field?.name ?? "");
const type = ref<ProfileFieldType>(props.field?.type ?? "TEXT");
const options = ref<string[]>([...(props.field?.options ?? [])]);
const value = ref(props.field?.value ?? "");

const needsOptions = computed(() => type.value === "SELECT" || type.value === "MULTI_SELECT");
const isValid = computed(() => name.value.trim().length > 0 && (!needsOptions.value || options.value.length > 0));

// Значение старого типа не подходит новому
watch(type, (next, previous) => {
	if (next !== previous) value.value = "";
});

const handleCancel = () => {
	visible.value = false;
	emit("cancel");
};

const handleSubmit = async () => {
	if (!isValid.value || isSaving.value) return;
	isSaving.value = true;
	const payload = {
		name: name.value.trim(),
		type: type.value,
		options: needsOptions.value ? options.value : [],
		value: value.value,
	};
	try {
		if (props.field) {
			await baseApi.users.updateProfileField({ userId: props.userId, fieldId: props.field.id }, undefined, payload);
		} else if (props.sectionId) {
			await baseApi.users.createProfileField({ userId: props.userId, sectionId: props.sectionId }, undefined, payload);
		}
		emit("resolve", true);
	} finally {
		isSaving.value = false;
	}
};
</script>

<template>
	<el-dialog
		v-model="visible"
		width="480px"
		align-center
		:title="field ? translate('profile.editField') : translate('profile.newField')"
		@close="handleCancel"
	>
		<el-form label-position="top" @submit.prevent="handleSubmit">
			<el-form-item :label="translate('settings.fieldName')" required>
				<el-input v-model="name" maxlength="100" autofocus />
			</el-form-item>
			<el-form-item :label="translate('settings.fieldType')">
				<el-select v-model="type" :teleported="false">
					<el-option v-for="item in FIELD_TYPES" :key="item" :label="translate(`fieldType.${item}`)" :value="item" />
				</el-select>
			</el-form-item>
			<el-form-item v-if="needsOptions" :label="translate('settings.options')" required>
				<el-select
					v-model="options"
					multiple
					filterable
					allow-create
					default-first-option
					:reserve-keyword="false"
					:teleported="false"
					:placeholder="translate('settings.optionsPlaceholder')"
				/>
			</el-form-item>
			<el-form-item :label="translate('profile.fieldValue')">
				<profile-field-control v-model="value" :type="type" :options="options" />
			</el-form-item>
			<base-form-actions :submit-label="translate('common.save')" :loading="isSaving" @cancel="handleCancel" />
		</el-form>
	</el-dialog>
</template>
