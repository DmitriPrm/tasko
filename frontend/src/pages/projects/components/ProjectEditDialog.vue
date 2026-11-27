<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import { openConfirm } from "@/shared/lib/dialog/openConfirm";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { useForm } from "@/shared/lib/form/useForm";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseFormActions from "@/shared/ui/form/BaseFormActions.vue";
import BaseForm from "@/shared/ui/form/generic/BaseForm.vue";

const emit = defineEmits<{
	resolve: [value: "saved" | "deleted"];
	cancel: [];
}>();

const props = defineProps<{
	projectId: string;
}>();

const visible = ref(true);
const isSubmitting = ref(false);
const isDeleting = ref(false);
const form = useForm();

const { fetch } = useFetch(baseApi.projects.getProjectEditForm, "data.fields", {
	pathParams: computed(() => ({ id: props.projectId })),
	onSuccess: ({ state }) => form.init(state || []),
});

onMounted(() => {
	fetch();
});

const handleCancel = () => emit("cancel");

const handleDelete = async () => {
	const confirmed = await openConfirm({
		title: translate("project.deleteTitle"),
		text: translate("project.deleteText"),
	});
	if (!confirmed) return;
	isDeleting.value = true;
	try {
		await baseApi.projects.deleteProject({ id: props.projectId });
		emit("resolve", "deleted");
	} finally {
		isDeleting.value = false;
	}
};

const handleSubmit = async () => {
	isSubmitting.value = true;
	try {
		await baseApi.projects.updateProject({ id: props.projectId }, undefined, form.payload.value);
		emit("resolve", "saved");
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<el-dialog v-model="visible" :title="translate('project.edit')" width="520px" @close="handleCancel">
		<base-form @submit="handleSubmit">
			<template #actions>
				<base-flex align="center" justify="space-between" :gap="3">
					<base-form-actions :submit-label="translate('common.save')" :loading="isSubmitting" @cancel="handleCancel" />
					<base-button type="danger" text :loading="isDeleting" @click="handleDelete">
						{{ translate("project.delete") }}
					</base-button>
				</base-flex>
			</template>
		</base-form>
	</el-dialog>
</template>
