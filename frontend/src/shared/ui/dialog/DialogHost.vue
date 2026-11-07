<script lang="ts" setup>
import { closeDialog, useDialogs } from "@/shared/lib/dialog/dialog";

const { dialogs } = useDialogs();

const handleResolve = (id: string, value: unknown) => closeDialog(id, value);
const handleCancel = (id: string) => closeDialog(id, false);
</script>

<template>
	<component
		:is="dialog.component"
		v-for="dialog in dialogs"
		:key="dialog.id"
		v-bind="dialog.props"
		@resolve="(value: unknown) => handleResolve(dialog.id, value)"
		@cancel="() => handleCancel(dialog.id)"
	/>
</template>
