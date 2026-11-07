<script lang="ts" setup>
import { onMounted, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { useForm } from "@/shared/lib/form/useForm";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseFormActions from "@/shared/ui/form/BaseFormActions.vue";
import BaseForm from "@/shared/ui/form/generic/BaseForm.vue";

const emit = defineEmits<{
	resolve: [value: true];
	cancel: [];
}>();

const visible = ref(true);
const isSubmitting = ref(false);
const form = useForm();

const { fetch } = useFetch(baseApi.projects.getProjectCreateForm, "data.fields", {
	onSuccess: ({ state }) => form.init(state || []),
});

onMounted(() => {
	fetch();
});

const handleCancel = () => emit("cancel");

const handleSubmit = async () => {
	isSubmitting.value = true;
	try {
		await baseApi.projects.createProject(undefined, undefined, form.payload.value);
		emit("resolve", true);
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<el-dialog v-model="visible" :title="translate('project.create')" width="520px" @close="handleCancel">
		<base-form @submit="handleSubmit">
			<template #actions>
				<base-form-actions :submit-label="translate('common.create')" :loading="isSubmitting" @cancel="handleCancel" />
			</template>
		</base-form>
	</el-dialog>
</template>
