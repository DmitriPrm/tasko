<script lang="ts" setup>
import { computed, ref } from "vue";

import type { ProjectColumn } from "@/shared/api/v0/schemas";
import { translate } from "@/shared/lib/theming/i18n/translate";

export interface DeleteColumnResult {
	action: "delete" | "move";
	targetColumnId?: string;
}

const emit = defineEmits<{
	resolve: [value: DeleteColumnResult];
	cancel: [];
}>();

const props = defineProps<{
	column: ProjectColumn;
	otherColumns: ProjectColumn[];
}>();

const visible = ref(true);
const action = ref<"delete" | "move">(props.otherColumns.length ? "move" : "delete");
const targetColumnId = ref("");

const canSubmit = computed(() => action.value === "delete" || Boolean(targetColumnId.value));

const handleSubmit = () => {
	if (!canSubmit.value) return;
	emit("resolve", {
		action: action.value,
		targetColumnId: action.value === "move" ? targetColumnId.value : undefined,
	});
};

const handleCancel = () => {
	visible.value = false;
	emit("cancel");
};
</script>

<template>
	<el-dialog v-model="visible" class="delete-column-dialog" width="460px" align-center @close="handleCancel">
		<template #header>
			<span class="delete-column-dialog__title">{{ translate("board.deleteColumnTitle") }}</span>
		</template>
		<base-flex direction="column" :gap="4">
			<p class="delete-column-dialog__caption">{{ translate("board.chooseAction") }}</p>
			<el-radio-group v-model="action" class="delete-column-dialog__options">
				<el-radio value="delete">{{ translate("board.deleteWithTasks") }}</el-radio>
				<el-radio value="move" :disabled="!otherColumns.length">{{ translate("board.deleteAndMove") }}</el-radio>
			</el-radio-group>
			<el-select
				v-model="targetColumnId"
				:disabled="action !== 'move'"
				:teleported="false"
				:placeholder="translate('board.chooseColumn')"
			>
				<el-option v-for="item in otherColumns" :key="item.id" :label="item.name" :value="item.id" />
			</el-select>
			<base-flex :gap="3">
				<base-button type="danger" :disabled="!canSubmit" @click="handleSubmit">
					{{ translate("common.delete") }}
				</base-button>
				<base-button @click="handleCancel">{{ translate("common.cancel") }}</base-button>
			</base-flex>
		</base-flex>
	</el-dialog>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.delete-column-dialog {
	&__title {
		font-size: map.get($font-sizes, 5);
		font-weight: 600;
	}

	&__caption {
		margin: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
	}

	&__options {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
}
</style>
