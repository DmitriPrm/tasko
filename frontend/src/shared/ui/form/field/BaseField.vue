<script lang="ts" setup>
import type { FormField } from "@/shared/lib/form/types";

interface Props {
	field: FormField;
}

defineProps<Props>();
</script>

<template>
	<label class="base-field">
		<span class="base-field__label">
			{{ field.name }}
			<em v-if="field.require">*</em>
		</span>
		<slot />
		<small v-if="field.description" class="base-field__description">{{ field.description }}</small>
	</label>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.base-field {
	display: block;
	margin-bottom: map.get($spacers, 4);

	&__label {
		display: block;
		margin-bottom: map.get($spacers, 2);
		font-size: map.get($font-sizes, 6);

		em {
			color: var(--mt-color-danger);
			font-style: normal;
		}
	}

	&__description {
		display: block;
		margin-top: map.get($spacers, 1);
		color: var(--mt-color-gray-500);
	}
}
</style>
