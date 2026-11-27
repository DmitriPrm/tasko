<script lang="ts" setup>
import { ElMessage } from "element-plus";
import { computed, onMounted, ref, watch } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import { apiInstance } from "@/shared/api/v0/base";
import type { Project } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { formatDate, formatDateTime } from "@/shared/lib/helpers/formatDate";
import { priorityLabel, statusLabel, typeLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import { useTaskDrawerStore } from "@/store/taskDrawer";

/**
 * Данные: выгрузка задач в Excel, обезличенный набор для ML и журнал действий
 * (кто, когда и что менял в задачах).
 */
const taskDrawer = useTaskDrawerStore();

const { state: projectsState } = useFetch(baseApi.projects.getProjects, "data.items", {
	immediate: true,
	params: { perPage: 100 },
});
const projects = computed(() => (projectsState.value ?? []) as Project[]);

// --- выгрузки
const exportProjectId = ref("");
const downloading = ref("");

const download = async (path: string, fileName: string) => {
	downloading.value = fileName;
	try {
		const { data } = await apiInstance.get<Blob>(path, { responseType: "blob" });
		const url = URL.createObjectURL(data);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		link.click();
		URL.revokeObjectURL(url);
		ElMessage({ type: "success", message: translate("settings.data.downloaded") });
	} finally {
		downloading.value = "";
	}
};

const handleTasks = () =>
	download(
		`/settings/data/tasks.csv${exportProjectId.value ? `?projectId=${exportProjectId.value}` : ""}`,
		"tasko-tasks.csv",
	);
const handleDataset = () => download("/settings/data/ml-dataset.csv", "tasko-ml-dataset.csv");

// --- журнал действий
type AuditItem = {
	id: string;
	kind: "status" | "field";
	field: string;
	oldValue: string | null;
	newValue: string | null;
	comment: string | null;
	changedAt: string;
	actor: { id: string; fullName: string };
	task: { id: string; title: string; project: { id: string; name: string } };
};

const auditProjectId = ref("");
const page = ref(1);
const perPage = ref(20);
const audit = ref<{ items: AuditItem[]; total: number } | null>(null);
const isAuditLoading = ref(false);

const loadAudit = async () => {
	isAuditLoading.value = true;
	try {
		const { data } = await apiInstance.get("/settings/data/audit", {
			params: { page: page.value, perPage: perPage.value, projectId: auditProjectId.value || undefined },
		});
		audit.value = data.data;
	} finally {
		isAuditLoading.value = false;
	}
};

watch([auditProjectId, perPage], () => {
	page.value = 1;
	loadAudit();
});
watch(page, loadAudit);
onMounted(loadAudit);

const EMPTY = "—";
const formatValue = (item: AuditItem, value: string | null) => {
	if (value == null || value === "") return EMPTY;
	if (item.kind === "status") return statusLabel(value);
	if (item.field === "deadlineAt" || item.field === "plannedStartAt") return formatDate(value);
	if (item.field === "priority") return priorityLabel(value);
	if (item.field === "type") return typeLabel(value);
	if (item.field === "isCompleted") return translate(value === "true" ? "task.completed" : "task.notCompleted");
	if (item.field === "description") return translate("settings.data.textChanged");
	return value;
};
const fieldLabel = (item: AuditItem) =>
	item.kind === "status" ? translate("task.status") : translate(`task.field.${item.field}`);
</script>

<template>
	<base-flex direction="column" :gap="5">
		<base-card class="settings-card">
			<h3>{{ translate("settings.data.exportTitle") }}</h3>
			<p class="settings-card__hint">{{ translate("settings.data.exportHint") }}</p>
			<base-flex :gap="3" wrap="wrap" align="center">
				<el-select
					v-model="exportProjectId"
					clearable
					:placeholder="translate('settings.data.allProjects')"
					class="settings-data__select"
				>
					<el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
				</el-select>
				<base-button type="primary" :loading="downloading === 'tasko-tasks.csv'" @click="handleTasks">
					{{ translate("settings.data.exportTasks") }}
				</base-button>
			</base-flex>
		</base-card>

		<base-card class="settings-card">
			<h3>{{ translate("settings.data.datasetTitle") }}</h3>
			<p class="settings-card__hint">{{ translate("settings.data.datasetHint") }}</p>
			<base-button :loading="downloading === 'tasko-ml-dataset.csv'" @click="handleDataset">
				{{ translate("settings.data.exportDataset") }}
			</base-button>
		</base-card>

		<base-card class="settings-card settings-card--wide">
			<base-flex align="center" justify="space-between" :gap="3" wrap="wrap">
				<div>
					<h3>{{ translate("settings.data.auditTitle") }}</h3>
					<p class="settings-card__hint">{{ translate("settings.data.auditHint") }}</p>
				</div>
				<el-select
					v-model="auditProjectId"
					clearable
					:placeholder="translate('settings.data.allProjects')"
					class="settings-data__select"
				>
					<el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
				</el-select>
			</base-flex>

			<el-skeleton :loading="isAuditLoading && !audit" :rows="6" animated>
				<el-empty v-if="audit && !audit.items.length" :description="translate('common.empty')" />
				<table v-else-if="audit" class="settings-data__audit">
					<thead>
						<tr>
							<th>{{ translate("settings.data.when") }}</th>
							<th>{{ translate("settings.data.who") }}</th>
							<th>{{ translate("settings.data.task") }}</th>
							<th>{{ translate("settings.data.change") }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in audit.items" :key="item.id">
							<td class="settings-data__when">{{ formatDateTime(item.changedAt) }}</td>
							<td>{{ item.actor.fullName }}</td>
							<td>
								<button type="button" class="settings-data__task" @click="taskDrawer.open(item.task.id)">
									{{ item.task.title }}
								</button>
								<small>{{ item.task.project.name }}</small>
							</td>
							<td>
								<strong>{{ fieldLabel(item) }}:</strong>
								<template v-if="item.field === 'description'">{{ translate("settings.data.textChanged") }}</template>
								<template v-else
									>{{ formatValue(item, item.oldValue) }} → {{ formatValue(item, item.newValue) }}</template
								>
								<small v-if="item.comment">«{{ item.comment }}»</small>
							</td>
						</tr>
					</tbody>
				</table>
			</el-skeleton>

			<base-flex v-if="audit && audit.total > perPage" justify="center" class="settings-data__pager">
				<el-pagination
					v-model:current-page="page"
					v-model:page-size="perPage"
					:total="audit.total"
					:page-sizes="[20, 50, 100]"
					layout="total, prev, pager, next, sizes"
					background
				/>
			</base-flex>
		</base-card>
	</base-flex>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.settings-card {
	max-width: 720px;
	padding: map.get($spacers, 5) map.get($spacers, 6);

	&--wide {
		max-width: none;
	}

	h3 {
		margin: 0;
		font-size: map.get($font-sizes, 5);
	}

	&__hint {
		margin: map.get($spacers, 1) 0 map.get($spacers, 4);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 7);
	}
}

.settings-data {
	&__select {
		width: 260px;
	}

	&__audit {
		width: 100%;
		border-collapse: collapse;
		font-size: map.get($font-sizes, 7);

		th,
		td {
			padding: map.get($spacers, 2) map.get($spacers, 3);
			border-bottom: 1px solid var(--mt-color-gray-100);
			text-align: left;
			vertical-align: top;
		}

		th {
			color: var(--mt-color-gray-500);
			font-size: map.get($font-sizes, 8);
			font-weight: 650;
			letter-spacing: 0.04em;
			text-transform: uppercase;
		}

		small {
			display: block;
			color: var(--mt-color-gray-500);
		}
	}

	&__when {
		white-space: nowrap;
		color: var(--mt-color-gray-500);
	}

	&__task {
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--mt-color-primary);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	&__pager {
		margin-top: map.get($spacers, 4);

		:deep(.el-pagination__sizes .el-select) {
			width: 140px;
		}
	}
}
</style>
