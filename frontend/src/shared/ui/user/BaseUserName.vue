<script lang="ts" setup>
import { UserFilled } from "@/shared/ui/icon/icons";
import { computed } from "vue";
import { useRouter } from "vue-router";

import BaseAvatar from "@/shared/ui/avatar/BaseAvatar.vue";

const props = withDefaults(
	defineProps<{
		user?: {
			id?: string | null;
			userId?: string | null;
			fullName?: string | null;
			initials?: string | null;
			avatarColor?: string | null;
			avatarUrl?: string | null;
		} | null;
		name?: string;
		size?: number;
		iconOnly?: boolean;
		link?: boolean;
	}>(),
	{
		size: 24,
		link: true,
	},
);

const router = useRouter();

const label = computed(() => props.user?.fullName || props.name || "");
const userId = computed(() => props.user?.id || props.user?.userId || "");
const profileTo = computed(() =>
	props.link && userId.value ? { name: "profile", params: { id: userId.value } } : null,
);

const handleOpen = (event: MouseEvent) => {
	if (!profileTo.value) return;
	event.stopPropagation();
	event.preventDefault();
	router.push(profileTo.value);
};
</script>

<template>
	<component
		:is="profileTo ? 'button' : 'span'"
		v-if="label"
		class="base-user-name"
		:class="{ 'base-user-name--link': profileTo }"
		:type="profileTo ? 'button' : undefined"
		@click="handleOpen"
	>
		<base-flex align="center" :gap="2">
			<base-avatar
				v-if="user?.initials || user?.avatarColor || user?.avatarUrl"
				:name="label"
				:initials="user?.initials || undefined"
				:color="user?.avatarColor || undefined"
				:src="user?.avatarUrl"
				:size="size"
			/>
			<base-flex
				v-else
				class="base-user-name__icon"
				align="center"
				justify="center"
				:style="{ width: `${size}px`, height: `${size}px` }"
			>
				<el-icon :size="14"><user-filled /></el-icon>
			</base-flex>
			<span v-if="!iconOnly" class="base-user-name__label">{{ label }}</span>
		</base-flex>
	</component>
	<span v-else>—</span>
</template>

<style scoped lang="scss">
.base-user-name {
	display: inline-flex;
	max-width: 100%;
	min-width: 0;
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: left;

	&--link {
		cursor: pointer;

		&:hover {
			color: var(--mt-color-primary);

			.base-user-name__icon {
				background: var(--mt-color-primary);
				color: var(--mt-color-primary-inverse);
			}

			:deep(.base-avatar) {
				box-shadow: 0 0 0 2px var(--mt-color-primary);
			}
		}
	}

	&__icon {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--mt-color-primary-light);
		color: var(--mt-color-primary);
		flex-shrink: 0;
	}
}
</style>
