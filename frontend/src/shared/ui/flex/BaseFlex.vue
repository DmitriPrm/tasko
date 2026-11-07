<script lang="ts" setup>
import { computed } from "vue";

type FlexDirection = "row" | "row-reverse" | "column" | "column-reverse";
type FlexAlign = "stretch" | "center" | "flex-start" | "flex-end" | "baseline";
type FlexJustify = "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly";
type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";

interface FlexProps {
	as?: keyof HTMLElementTagNameMap;
	direction?: FlexDirection;
	align?: FlexAlign;
	justify?: FlexJustify;
	wrap?: FlexWrap;
	gap?: string | number;
	inline?: boolean;
	width?: string | "full";
	height?: string | "full";
}

const props = withDefaults(defineProps<FlexProps>(), {
	as: "div",
	direction: "row",
	align: "stretch",
	justify: "flex-start",
	wrap: "nowrap",
	inline: false,
	gap: 3,
});

const style = computed(() => ({
	display: props.inline ? "inline-flex" : "flex",
	flexDirection: props.direction,
	alignItems: props.align,
	justifyContent: props.justify,
	flexWrap: props.wrap,
	gap: typeof props.gap === "number" ? `${props.gap * 0.25}rem` : props.gap,
	width: props.width == "full" ? "100%" : props.width,
	height: props.height == "full" ? "100%" : props.height,
	flex: props.height == "full" ? 1 : undefined,
}));
</script>

<template>
	<component :is="as" class="base-flex" :style="style">
		<slot />
	</component>
</template>

<style scoped>
.base-flex {
	box-sizing: border-box;
}
</style>
