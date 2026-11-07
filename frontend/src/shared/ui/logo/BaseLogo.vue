<script setup lang="ts">
withDefaults(defineProps<{ size?: number; plain?: boolean }>(), { size: 36, plain: false });
</script>

<template>
	<svg
		class="base-logo"
		:width="size"
		:height="size"
		viewBox="0 0 64 64"
		fill="none"
		aria-hidden="true"
		focusable="false"
	>
		<defs>
			<linearGradient id="base-logo-bg" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
				<stop stop-color="#7B82FF" />
				<stop offset="0.55" stop-color="#4F56E8" />
				<stop offset="1" stop-color="#8B4FE8" />
			</linearGradient>
		</defs>
		<template v-if="!plain">
			<rect width="64" height="64" rx="18" fill="url(#base-logo-bg)" />
			<path d="M10 20C10 13 15 8 22 8h20" stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-linecap="round" />
		</template>
		<path d="M18 33.5 27.5 43 46 22" stroke="#fff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
		<circle cx="47" cy="47" r="4" fill="#fff" fill-opacity=".55" />
		<circle cx="17" cy="47" r="2.5" fill="#fff" fill-opacity=".35" />
	</svg>
</template>

<style scoped lang="scss">
.base-logo {
	display: block;
	flex-shrink: 0;
}
</style>
