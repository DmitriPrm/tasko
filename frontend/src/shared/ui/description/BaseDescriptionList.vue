<script lang="ts" setup></script>

<template>
	<section class="base-description-list">
		<slot />
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.base-description-list {
	display: grid;
	grid-template-columns: minmax(140px, 180px) minmax(0, 1fr);
	row-gap: map.get($spacers, 3);
	column-gap: map.get($spacers, 6);

	@media (max-width: 768px) {
		grid-template-columns: minmax(110px, 140px) minmax(0, 1fr);
		column-gap: map.get($spacers, 3);
	}
}
</style>
