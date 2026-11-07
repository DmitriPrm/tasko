<script lang="ts" setup>
import { computed } from "vue";

import type { ProfileField } from "@/shared/api/v0/schemas";
import { formatDate } from "@/shared/lib/helpers/formatDate";
import { translate } from "@/shared/lib/theming/i18n/translate";

const props = defineProps<{
	field: ProfileField;
}>();

const text = computed(() => {
	const value = props.field.value;
	if (!value) return "—";
	if (props.field.type === "CHECKBOX") return value === "true" ? translate("common.yes") : translate("common.no");
	if (props.field.type === "DATE") return formatDate(value) || "—";
	if (props.field.type === "MULTI_SELECT") {
		try {
			const parsed = JSON.parse(value);
			return Array.isArray(parsed) && parsed.length ? parsed.join(", ") : "—";
		} catch {
			return value;
		}
	}
	return value;
});
</script>

<template>
	{{ text }}
</template>
