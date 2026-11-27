<script lang="ts" setup>
import { computed } from "vue";

import type { User } from "@/shared/api/v0/schemas";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseUserName from "@/shared/ui/user/BaseUserName.vue";

const emit = defineEmits<{
	"update:modelValue": [value: string | string[]];
}>();

const props = defineProps<{
	modelValue?: string | string[] | null;
	users: User[];
	multiple?: boolean;
	clearable?: boolean;
	teleported?: boolean;
	placeholder?: string;
}>();

const selectedIds = computed(() => {
	if (Array.isArray(props.modelValue)) return props.modelValue;
	return props.modelValue ? [props.modelValue] : [];
});

const selectedUsers = computed(() => props.users.filter((user) => selectedIds.value.includes(user.id)));

const handleChange = (value: string | string[]) => {
	emit("update:modelValue", value);
};
</script>

<template>
	<el-select
		class="base-user-select"
		:model-value="multiple ? selectedIds : selectedIds[0] || ''"
		:multiple="multiple"
		:clearable="clearable"
		:teleported="teleported !== false"
		filterable
		:placeholder="placeholder || translate('task.unassigned')"
		@change="(value: string | string[]) => handleChange(value)"
	>
		<template v-if="!multiple && selectedUsers[0]" #prefix>
			<base-user-name :user="selectedUsers[0]" :size="18" icon-only :link="false" />
		</template>
		<el-option v-for="user in users" :key="user.id" :label="user.fullName" :value="user.id">
			<base-user-name :user="user" :size="20" :link="false" />
		</el-option>
	</el-select>
</template>
