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
	/** Создание подзадачи: задача будет привязана к этой родительской */
	parentTaskId?: string;
	parentTitle?: string;
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
		const payload = props.parentTaskId
			? { ...form.payload.value, parentTaskId: props.parentTaskId }
			: form.payload.value;
		await baseApi.tasks.createTask({ id: props.projectId }, undefined, payload);
		emit("resolve", true);
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<el-dialog
		v-model="visible"
		:title="translate(parentTaskId ? 'task.createSubtask' : 'task.create')"
		width="560px"
		@close="handleCancel"
	>
		<p v-if="parentTitle" class="task-create-dialog__parent">{{ translate("task.parent") }} «{{ parentTitle }}»</p>
		<base-form @submit="handleSubmit">
			<template #actions>
				<base-form-actions :submit-label="translate('common.create')" :loading="isSubmitting" @cancel="handleCancel" />
			</template>
		</base-form>
	</el-dialog>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.task-create-dialog__parent {
	margin: 0 0 map.get($spacers, 4);
	color: var(--mt-color-gray-500);
	font-size: map.get($font-sizes, 7);
}
</style>
