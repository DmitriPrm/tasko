<script lang="ts" setup>
import { computed, ref } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import type { BriefTask, DependencyKind, Task, TaskDependencies } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { statusLabel, statusTagType } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseIconButton from "@/shared/ui/button/BaseIconButton.vue";
import { Close } from "@/shared/ui/icon/icons";

const emit = defineEmits<{
	open: [taskId: string];
	changed: [];
}>();

const props = defineProps<{
	taskId: string;
	projectId: string;
	editable?: boolean;
}>();

const KINDS: DependencyKind[] = ["DEPENDS_ON", "BLOCKS", "RELATED"];

const kind = ref<DependencyKind>("DEPENDS_ON");
const pickedId = ref("");
const options = ref<{ id: string; title: string }[]>([]);
const isSearching = ref(false);
const isSaving = ref(false);

const { state, fetch } = useFetch(baseApi.tasks.getTaskDependencies, "data", {
	immediate: true,
	pathParams: computed(() => ({ id: props.taskId })),
});

const links = computed(() => state.value as TaskDependencies | undefined);

const groups = computed(() => [
	{ key: "blockedBy", title: translate("task.blockedBy"), items: links.value?.blockedBy ?? [] },
	{ key: "blocks", title: translate("task.blocksOthers"), items: links.value?.blocks ?? [] },
	{ key: "related", title: translate("task.related"), items: links.value?.related ?? [] },
]);

const hasLinks = computed(() => groups.value.some((group) => group.items.length));
const linkedIds = computed(() => new Set(groups.value.flatMap((group) => group.items.map((item) => item.task.id))));
const isDone = (task: BriefTask) => task.status === "DONE" || task.isCompleted;

const handleSearch = async (query: string) => {
	isSearching.value = true;
	try {
		const { data } = await baseApi.tasks.getProjectTasks(
			{ id: props.projectId },
			{ search: query || undefined, perPage: 20 },
		);
		const items = (data?.data.items ?? []) as Task[];
		options.value = items
			.filter((task) => task.id !== props.taskId && !linkedIds.value.has(task.id))
			.map((task) => ({ id: task.id, title: task.title }));
	} finally {
		isSearching.value = false;
	}
};

const handleLink = async () => {
	if (!pickedId.value || isSaving.value) return;
	isSaving.value = true;
	try {
		await baseApi.tasks.addTaskDependency({ id: props.taskId }, undefined, {
			taskId: pickedId.value,
			kind: kind.value,
		});
		pickedId.value = "";
		options.value = [];
		await fetch();
		emit("changed");
	} finally {
		isSaving.value = false;
	}
};

const handleUnlink = async (dependencyId: string) => {
	await baseApi.tasks.removeTaskDependency({ id: props.taskId, dependencyId });
	await fetch();
	emit("changed");
};
</script>

<template>
	<section class="task-dependencies">
		<h3>{{ translate("task.links") }}</h3>
		<p v-if="!hasLinks" class="task-dependencies__empty">{{ translate("task.noLinks") }}</p>
		<template v-for="group in groups" :key="group.key">
			<div v-if="group.items.length" class="task-dependencies__group">
				<span class="task-dependencies__group-title">{{ group.title }}</span>
				<ul>
					<li v-for="item in group.items" :key="item.dependencyId">
						<button class="task-dependencies__task" type="button" @click="() => emit('open', item.task.id)">
							<span class="task-dependencies__name" :class="{ 'task-dependencies__name--done': isDone(item.task) }">
								{{ item.task.title }}
							</span>
							<el-tag :type="statusTagType[item.task.status]" size="small">
								{{ statusLabel(item.task.status) }}
							</el-tag>
						</button>
						<base-icon-button
							v-if="editable"
							:label="translate('task.unlink')"
							@click="() => handleUnlink(item.dependencyId)"
						>
							<el-icon :size="14"><close /></el-icon>
						</base-icon-button>
					</li>
				</ul>
			</div>
		</template>

		<base-flex v-if="editable" class="task-dependencies__form" :gap="2" wrap="wrap">
			<el-select v-model="kind" class="task-dependencies__kind">
				<el-option v-for="item in KINDS" :key="item" :label="translate(`task.linkKind.${item}`)" :value="item" />
			</el-select>
			<el-select
				v-model="pickedId"
				class="task-dependencies__pick"
				filterable
				remote
				clearable
				:remote-method="handleSearch"
				:loading="isSearching"
				:placeholder="translate('task.linkPick')"
				@focus="() => !options.length && handleSearch('')"
			>
				<el-option v-for="item in options" :key="item.id" :label="item.title" :value="item.id" />
			</el-select>
			<base-button :disabled="!pickedId" :loading="isSaving" @click="handleLink">
				{{ translate("task.link") }}
			</base-button>
		</base-flex>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.task-dependencies {
	h3 {
		margin: 0 0 map.get($spacers, 3);
		font-size: map.get($font-sizes, 6);
		font-weight: 600;
	}

	&__empty {
		margin: 0;
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 6);
	}

	&__group {
		margin-bottom: map.get($spacers, 3);

		ul {
			display: flex;
			flex-direction: column;
			gap: map.get($spacers, 1);
			margin: map.get($spacers, 1) 0 0;
			padding: 0;
			list-style: none;
		}

		li {
			display: flex;
			align-items: center;
			gap: map.get($spacers, 1);
		}
	}

	&__group-title {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	&__task {
		display: flex;
		flex: 1;
		align-items: center;
		gap: map.get($spacers, 2);
		min-width: 0;
		padding: map.get($spacers, 2);
		border: 0;
		border-radius: var(--mt-radius-sm);
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: map.get($font-sizes, 6);
		text-align: left;
		cursor: pointer;

		&:hover {
			background: var(--mt-color-gray-50);
		}
	}

	&__name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;

		&--done {
			color: var(--mt-color-gray-400);
			text-decoration: line-through;
		}
	}

	&__form {
		margin-top: map.get($spacers, 3);
	}

	&__kind {
		width: 150px;
	}

	&__pick {
		flex: 1 1 200px;
	}
}
</style>
