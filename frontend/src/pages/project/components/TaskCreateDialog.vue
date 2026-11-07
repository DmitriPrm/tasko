<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

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

const props = defineProps<{
	projectId: string;
}>();

const visible = ref(true);
const isSubmitting = ref(false);
const form = useForm();

const { fetch } = useFetch(baseApi.tasks.getTaskCreateForm, "data.fields", {
	pathParams: computed(() => ({ id: props.projectId })),
	onSuccess: ({ state }) => form.init(state || []),
});

onMounted(() => {
	fetch();
});

const handleCancel = () => emit("cancel");

const handleSubmit = async () => {
	isSubmitting.value = true;
	try {
		await baseApi.tasks.createTask({ id: props.projectId }, undefined, form.payload.value);
		emit("resolve", true);
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<el-dialog v-model="visible" :title="translate('task.create')" width="560px" @close="handleCancel">
		<base-form @submit="handleSubmit">
			<template #actions>
				<base-form-actions :submit-label="translate('common.create')" :loading="isSubmitting" @cancel="handleCancel" />
			</template>
		</base-form>
	</el-dialog>
</template>
