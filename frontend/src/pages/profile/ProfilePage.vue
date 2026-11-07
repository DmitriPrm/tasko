<script lang="ts" setup>
import { ElMessage } from "element-plus";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import ProfileAvatarCropper from "@/pages/profile/components/ProfileAvatarCropper.vue";
import ProfileFieldSections from "@/pages/profile/components/ProfileFieldSections.vue";
import ProfileRights from "@/pages/profile/components/ProfileRights.vue";
import { baseApi } from "@/shared/api/baseApi";
import type { Profile, Task } from "@/shared/api/v0/schemas";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { useOnTaskChange } from "@/shared/lib/composable/useOnTaskChange";
import { formatDate, isTaskOverdue } from "@/shared/lib/helpers/formatDate";
import {
	PRIORITY_RANK,
	priorityLabel,
	priorityTagType,
	projectStatusDot,
	roleLabel,
	statusLabel,
	STATUS_RANK,
	statusTagType,
} from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";
import BaseAvatar from "@/shared/ui/avatar/BaseAvatar.vue";
import BaseCard from "@/shared/ui/card/BaseCard.vue";
import { Clock, CircleCheck, Edit, Memo, Warning } from "@/shared/ui/icon/icons";
import BasePage from "@/shared/ui/page/BasePage.vue";
import BaseTable from "@/shared/ui/table/BaseTable.vue";
import { useAuthStore } from "@/store/auth";
import { useTaskDrawerStore } from "@/store/taskDrawer";

const route = useRoute();
const authStore = useAuthStore();
const taskDrawer = useTaskDrawerStore();

const activeTab = ref("overview");
const taskFilter = ref<"active" | "done" | "all">("active");
const fullName = ref("");
const isSaving = ref(false);
const avatarInput = ref<HTMLInputElement | null>(null);

const userId = computed(() => String(route.params.id || authStore.user?.id || ""));

function applyProfile(state?: Profile) {
	if (!state) return;
	fullName.value = state.fullName;
}

const {
	state: profile,
	isLoading,
	fetch: fetchProfile,
} = useFetch(baseApi.users.getProfile, "data", {
	immediate: true,
	pathParams: computed(() => ({ id: userId.value })),
	onSuccess: ({ state }) => applyProfile(state),
});

const {
	state: tasksState,
	isLoading: isTasksLoading,
	fetch: fetchTasks,
} = useFetch(baseApi.tasks.getTasks, "data", {
	immediate: true,
	params: computed(() => ({ assigneeId: userId.value, perPage: 100 })),
});

const tasks = computed(() => (tasksState.value?.items || []) as Task[]);
const tasksTotal = computed(() => tasksState.value?.total ?? tasks.value.length);
const canViewTasks = computed(() => authStore.hasPermission("TASKS_VIEW"));

const STATUS_ORDER = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"] as const;
const STATUS_COLOR: Record<string, string> = {
	TODO: "var(--mt-color-gray-300)",
	IN_PROGRESS: "var(--mt-color-warning)",
	REVIEW: "var(--mt-color-primary)",
	DONE: "var(--mt-color-success)",
	CANCELLED: "var(--mt-color-gray-200)",
};

const isDone = (task: Task) => task.isCompleted || task.status === "DONE";
const isOpen = (task: Task) => !isDone(task) && task.status !== "CANCELLED";

const stats = computed(() => {
	const list = tasks.value;
	const done = list.filter(isDone).length;
	const open = list.filter(isOpen);
	return {
		assigned: list.length,
		inProgress: list.filter((task) => task.status === "IN_PROGRESS" && !isDone(task)).length,
		done,
		overdue: list.filter(isTaskOverdue).length,
		open: open.length,
		percent: list.length ? Math.round((done / list.length) * 100) : 0,
	};
});

const statusBreakdown = computed(() => {
	const total = tasks.value.length || 1;
	return STATUS_ORDER.map((status) => {
		const count = tasks.value.filter((task) =>
			status === "DONE" ? isDone(task) : task.status === status && !isDone(task),
		).length;
		return { status, count, width: (count / total) * 100 };
	}).filter((item) => item.count > 0);
});

const upcoming = computed(() =>
	tasks.value
		.filter((task) => isOpen(task) && task.deadlineAt)
		.sort((a, b) => new Date(a.deadlineAt as string).getTime() - new Date(b.deadlineAt as string).getTime())
		.slice(0, 6),
);

const userProjects = computed(() => {
	const map = new Map<string, { id: string; name: string; status: string; open: number; total: number }>();
	for (const task of tasks.value) {
		if (!task.project) continue;
		const entry = map.get(task.project.id) || {
			id: task.project.id,
			name: task.project.name,
			status: task.project.status,
			open: 0,
			total: 0,
		};
		entry.total += 1;
		if (isOpen(task)) entry.open += 1;
		map.set(task.project.id, entry);
	}
	return [...map.values()].sort((a, b) => b.open - a.open || b.total - a.total);
});

const filteredTasks = computed(() => {
	if (taskFilter.value === "all") return tasks.value;
	if (taskFilter.value === "done") return tasks.value.filter(isDone);
	return tasks.value.filter(isOpen);
});

const statCards = computed(() => [
	{ key: "assigned", label: translate("profile.assigned"), value: stats.value.assigned, icon: Memo, tone: "primary" },
	{
		key: "inProgress",
		label: translate("profile.inProgress"),
		value: stats.value.inProgress,
		icon: Clock,
		tone: "warning",
	},
	{ key: "done", label: translate("profile.done"), value: stats.value.done, icon: CircleCheck, tone: "success" },
	{ key: "overdue", label: translate("profile.overdue"), value: stats.value.overdue, icon: Warning, tone: "danger" },
]);

const initialTab = () => (canViewTasks.value ? "overview" : "details");

const columns = computed(() => [
	{ key: "title", label: translate("task.name") },
	{ key: "project", label: translate("project.title") },
	{ key: "status", label: translate("task.status"), sortValue: (row: Task) => STATUS_RANK[row.status] },
	{ key: "priority", label: translate("task.priority"), sortValue: (row: Task) => PRIORITY_RANK[row.priority] },
	{ key: "deadlineAt", label: translate("task.deadline") },
]);

const syncAuth = () => {
	const current = authStore.user;
	if (!profile.value || !current || current.id !== profile.value.id) return;
	authStore.user = {
		...current,
		fullName: profile.value.fullName,
		initials: profile.value.initials,
		avatarColor: profile.value.avatarColor,
		avatarUrl: profile.value.avatarUrl,
		systemRole: profile.value.systemRole,
		permissions: profile.value.permissions,
		updatedAt: profile.value.updatedAt,
	};
};

const handleOpenTask = (task: Task) => {
	taskDrawer.open(task.id);
};

const handleReset = () => applyProfile(profile.value);

const handleSave = async () => {
	isSaving.value = true;
	try {
		await baseApi.users.updateProfile({ id: userId.value }, undefined, {
			fullName: fullName.value.trim(),
		});
		await fetchProfile();
		syncAuth();
	} finally {
		isSaving.value = false;
	}
};

const handleSavedRights = () => {
	fetchProfile();
};

const handlePickAvatar = () => avatarInput.value?.click();

const cropperFile = ref<File | null>(null);
const isCropperOpen = ref(false);
const isAvatarSaving = ref(false);
const MAX_AVATAR_SOURCE = 15 * 1024 * 1024;

const handleAvatarFile = (event: Event) => {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = "";
	if (!file) return;
	if (!file.type.startsWith("image/")) {
		ElMessage.error(translate("profile.avatarNotImage"));
		return;
	}
	if (file.size > MAX_AVATAR_SOURCE) {
		ElMessage.error(translate("profile.avatarTooBig"));
		return;
	}
	cropperFile.value = file;
	isCropperOpen.value = true;
};

const handleAvatarCropped = async (blob: Blob) => {
	isAvatarSaving.value = true;
	try {
		const body = new FormData();
		body.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
		await baseApi.users.updateAvatar({ id: userId.value }, undefined, body);
		await fetchProfile();
		syncAuth();
		isCropperOpen.value = false;
	} finally {
		isAvatarSaving.value = false;
	}
};

useOnTaskChange({ reload: () => fetchTasks() });

watch(userId, () => {
	activeTab.value = initialTab();
	taskFilter.value = "active";
});

watch(
	canViewTasks,
	(canView) => {
		if (!canView && ["overview", "tasks"].includes(activeTab.value)) activeTab.value = "details";
	},
	{ immediate: true },
);
</script>

<template>
	<base-page :title="translate('nav.profile')">
		<el-skeleton :loading="isLoading && !profile" animated>
			<div v-if="profile" class="profile-page">
				<base-card class="profile-page__hero">
					<div class="profile-page__cover" aria-hidden="true" />
					<div class="profile-page__hero-body">
						<div class="profile-page__avatar-wrap">
							<button
								v-if="profile.canEdit"
								class="profile-page__avatar"
								type="button"
								:aria-label="translate('profile.changeAvatar')"
								:title="translate('profile.changeAvatar')"
								@click="handlePickAvatar"
							>
								<base-avatar
									:name="profile.fullName"
									:initials="profile.initials"
									:color="profile.avatarColor"
									:src="profile.avatarUrl"
									:size="96"
								/>
								<span class="profile-page__avatar-edit">
									<el-icon :size="18"><edit /></el-icon>
								</span>
							</button>
							<span v-else class="profile-page__avatar profile-page__avatar--static">
								<base-avatar
									:name="profile.fullName"
									:initials="profile.initials"
									:color="profile.avatarColor"
									:src="profile.avatarUrl"
									:size="96"
								/>
							</span>
						</div>
						<div class="profile-page__identity">
							<h2 class="profile-page__name">{{ profile.fullName }}</h2>
							<a class="profile-page__email" :href="`mailto:${profile.email}`">{{ profile.email }}</a>
							<base-flex align="center" :gap="2" wrap="wrap">
								<el-tag>{{ roleLabel(profile.systemRole) }}</el-tag>
								<el-tag :type="profile.isActive ? 'success' : 'info'">
									{{ profile.isActive ? translate("users.active") : translate("users.blocked") }}
								</el-tag>
							</base-flex>
						</div>
						<base-button v-if="profile.canEdit" class="profile-page__hero-action" @click="handlePickAvatar">
							{{ translate("profile.changeAvatar") }}
						</base-button>
					</div>
					<input
						ref="avatarInput"
						class="profile-page__file"
						type="file"
						accept="image/png,image/jpeg,image/webp"
						@change="handleAvatarFile"
					/>
					<profile-avatar-cropper
						v-model="isCropperOpen"
						:file="cropperFile"
						:loading="isAvatarSaving"
						@confirm="handleAvatarCropped"
					/>
				</base-card>

				<div class="profile-page__layout">
					<aside class="profile-page__aside">
						<base-card class="profile-page__panel">
							<h3 class="profile-page__panel-title">{{ translate("profile.info") }}</h3>
							<dl class="profile-page__facts">
								<div>
									<dt>{{ translate("users.email") }}</dt>
									<dd>
										<a class="profile-page__link" :href="`mailto:${profile.email}`">{{ profile.email }}</a>
									</dd>
								</div>
								<div>
									<dt>{{ translate("users.role") }}</dt>
									<dd>{{ roleLabel(profile.systemRole) }}</dd>
								</div>
								<div>
									<dt>{{ translate("profile.status") }}</dt>
									<dd>{{ profile.isActive ? translate("users.active") : translate("users.blocked") }}</dd>
								</div>
								<div>
									<dt>{{ translate("profile.registered") }}</dt>
									<dd>{{ formatDate(profile.createdAt) }}</dd>
								</div>
							</dl>
						</base-card>

						<base-card v-if="canViewTasks" class="profile-page__panel">
							<h3 class="profile-page__panel-title">{{ translate("profile.projects") }}</h3>
							<ul v-if="userProjects.length" class="profile-page__projects">
								<li v-for="project in userProjects" :key="project.id">
									<router-link class="profile-page__project" :to="{ name: 'project', params: { id: project.id } }">
										<span class="profile-page__dot" :style="{ background: projectStatusDot[project.status] }" />
										<span class="profile-page__project-name">{{ project.name }}</span>
										<span class="profile-page__project-count">{{ project.open }}/{{ project.total }}</span>
									</router-link>
								</li>
							</ul>
							<p v-else class="profile-page__muted">{{ translate("profile.noProjects") }}</p>
						</base-card>
					</aside>

					<main class="profile-page__main">
						<el-tabs v-model="activeTab" class="profile-page__tabs">
							<el-tab-pane v-if="canViewTasks" :label="translate('profile.overview')" name="overview">
								<div class="profile-page__stats">
									<base-card
										v-for="card in statCards"
										:key="card.key"
										class="profile-page__stat"
										:class="`profile-page__stat--${card.tone}`"
									>
										<span class="profile-page__stat-icon" aria-hidden="true">
											<el-icon :size="20"><component :is="card.icon" /></el-icon>
										</span>
										<span class="profile-page__stat-value">{{ card.value }}</span>
										<span class="profile-page__stat-label">{{ card.label }}</span>
									</base-card>
								</div>

								<base-card class="profile-page__panel profile-page__panel--spaced">
									<base-flex align="center" justify="space-between" :gap="3">
										<h3 class="profile-page__panel-title">{{ translate("profile.distribution") }}</h3>
										<span class="profile-page__percent">
											{{ translate("profile.completion") }}: <strong>{{ stats.percent }}%</strong>
										</span>
									</base-flex>
									<div v-if="statusBreakdown.length" class="profile-page__bar" role="img">
										<span
											v-for="item in statusBreakdown"
											:key="item.status"
											class="profile-page__bar-segment"
											:style="{ width: `${item.width}%`, background: STATUS_COLOR[item.status] }"
											:title="`${statusLabel(item.status)}: ${item.count}`"
										/>
									</div>
									<div v-else class="profile-page__bar profile-page__bar--empty" />
									<ul class="profile-page__legend">
										<li v-for="status in STATUS_ORDER" :key="status">
											<span class="profile-page__dot" :style="{ background: STATUS_COLOR[status] }" />
											{{ statusLabel(status) }}
											<strong>{{ statusBreakdown.find((item) => item.status === status)?.count ?? 0 }}</strong>
										</li>
									</ul>
								</base-card>

								<base-card class="profile-page__panel profile-page__panel--spaced">
									<h3 class="profile-page__panel-title">{{ translate("profile.deadlines") }}</h3>
									<el-skeleton v-if="isTasksLoading && !tasksState" :rows="3" animated />
									<ul v-else-if="upcoming.length" class="profile-page__deadlines">
										<li v-for="task in upcoming" :key="task.id">
											<button class="profile-page__deadline" type="button" @click="handleOpenTask(task)">
												<span class="profile-page__deadline-main">
													<span class="profile-page__deadline-title">{{ task.title }}</span>
													<span class="profile-page__muted">{{ task.project?.name }}</span>
												</span>
												<el-tag :type="priorityTagType[task.priority]" size="small">
													{{ priorityLabel(task.priority) }}
												</el-tag>
												<span
													class="profile-page__deadline-date"
													:class="{ 'profile-page__deadline-date--overdue': isTaskOverdue(task) }"
												>
													{{ formatDate(task.deadlineAt) }}
												</span>
											</button>
										</li>
									</ul>
									<p v-else class="profile-page__muted">{{ translate("profile.noDeadlines") }}</p>
								</base-card>
							</el-tab-pane>

							<el-tab-pane v-if="canViewTasks" :label="translate('profile.tasks')" name="tasks">
								<base-card class="profile-page__panel">
									<base-flex align="center" justify="space-between" :gap="3" wrap="wrap">
										<el-radio-group v-model="taskFilter" size="small">
											<el-radio-button value="active">{{ translate("profile.filterActive") }}</el-radio-button>
											<el-radio-button value="done">{{ translate("profile.filterDone") }}</el-radio-button>
											<el-radio-button value="all">{{ translate("profile.filterAll") }}</el-radio-button>
										</el-radio-group>
										<span v-if="tasksTotal > tasks.length" class="profile-page__muted">
											{{ tasks.length }} {{ translate("profile.of") }} {{ tasksTotal }}
										</span>
									</base-flex>
									<base-table
										v-if="isTasksLoading || filteredTasks.length"
										class="profile-page__table"
										code="profile-tasks"
										:rows="filteredTasks"
										:columns="columns"
										:loading="isTasksLoading"
										@row-click="handleOpenTask"
									>
										<template #project="{ row }">{{ row.project?.name }}</template>
										<template #status="{ row }">
											<el-tag :type="statusTagType[row.status]" size="small">{{ statusLabel(row.status) }}</el-tag>
										</template>
										<template #priority="{ row }">{{ priorityLabel(row.priority) }}</template>
										<template #deadlineAt="{ row }">
											<span :class="{ 'profile-page__deadline-date--overdue': isTaskOverdue(row) }">
												{{ formatDate(row.deadlineAt) || "—" }}
											</span>
										</template>
									</base-table>
									<el-empty v-else :description="translate('profile.noTasks')" />
								</base-card>
							</el-tab-pane>

							<el-tab-pane :label="translate('profile.details')" name="details">
								<el-form v-if="profile.canEdit" label-position="top" @submit.prevent="handleSave">
									<base-flex direction="column" :gap="5">
										<base-card class="profile-page__panel">
											<el-form-item :label="translate('users.fullName')">
												<el-input v-model="fullName" />
											</el-form-item>
										</base-card>
										<base-flex justify="flex-start" :gap="3">
											<base-button native-type="submit" type="primary" :loading="isSaving">
												{{ translate("common.save") }}
											</base-button>
											<base-button @click="handleReset">{{ translate("common.cancel") }}</base-button>
										</base-flex>
									</base-flex>
								</el-form>
								<profile-field-sections
									class="profile-page__sections"
									:user-id="profile.id"
									:sections="profile.sections"
									:editable="profile.canEdit"
									@changed="fetchProfile"
								/>
							</el-tab-pane>

							<el-tab-pane v-if="profile.canEditRights" :label="translate('profile.rights')" name="rights">
								<profile-rights
									:user-id="profile.id"
									:system-role="profile.systemRole"
									:permissions="profile.permissions"
									@saved="handleSavedRights"
								/>
							</el-tab-pane>
						</el-tabs>
					</main>
				</div>
			</div>
		</el-skeleton>
	</base-page>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.profile-page {
	display: flex;
	flex-direction: column;
	gap: map.get($spacers, 5);

	&__hero {
		position: relative;
		overflow: hidden;
	}

	&__cover {
		height: 120px;
		background: radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.28), transparent 45%),
			radial-gradient(circle at 85% 80%, rgba(255, 255, 255, 0.18), transparent 40%), var(--mt-gradient-brand);
	}

	&__hero-body {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: map.get($spacers, 5);
		padding: map.get($spacers, 6);
	}

	&__avatar-wrap {
		flex-shrink: 0;
	}

	&__avatar {
		position: relative;
		display: block;
		padding: 0;
		border: 4px solid var(--mt-color-white);
		border-radius: 50%;
		background: var(--mt-color-white);
		box-shadow: var(--mt-shadow);
		cursor: pointer;

		&--static {
			cursor: default;
		}

		&:hover .profile-page__avatar-edit,
		&:focus-visible .profile-page__avatar-edit {
			opacity: 1;
		}
	}

	&__avatar-edit {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: rgba(15, 18, 38, 0.5);
		color: #fff;
		opacity: 0;
		transition: opacity 0.18s var(--mt-ease);
	}

	&__identity {
		display: flex;
		flex: 1 1 240px;
		flex-direction: column;
		gap: map.get($spacers, 2);
		min-width: 0;
	}

	&__name {
		margin: 0;
		font-size: map.get($font-sizes, 2);
		font-weight: 700;
		letter-spacing: -0.02em;
		overflow-wrap: anywhere;
	}

	&__email,
	&__link {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
		overflow-wrap: anywhere;

		&:hover {
			color: var(--mt-color-primary);
		}
	}

	&__facts {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 4);
		margin: 0;

		dt {
			margin-bottom: 2px;
			color: var(--mt-color-gray-400);
			font-size: map.get($font-sizes, 8);
			font-weight: 600;
			letter-spacing: 0.04em;
			text-transform: uppercase;
		}

		dd {
			margin: 0;
			font-size: map.get($font-sizes, 6);
			font-weight: 500;
			overflow-wrap: anywhere;
		}
	}

	&__file {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		opacity: 0;
	}

	&__layout {
		display: grid;
		grid-template-columns: 340px minmax(0, 1fr);
		gap: map.get($spacers, 5);
		align-items: start;
	}

	&__aside {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 5);
	}

	&__main {
		min-width: 0;
	}

	&__sections {
		margin-top: map.get($spacers, 5);
	}

	&__panel {
		padding: map.get($spacers, 5);

		&--spaced {
			margin-top: map.get($spacers, 5);
		}
	}

	&__panel-title {
		margin: 0 0 map.get($spacers, 4);
		font-size: map.get($font-sizes, 5);
		font-weight: 650;
		letter-spacing: -0.01em;
	}

	&__muted {
		margin: 0;
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 7);
	}

	&__tabs {
		:deep(.el-tabs__header) {
			margin-bottom: map.get($spacers, 5);
		}
	}

	&__dot {
		display: inline-block;
		flex-shrink: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	&__projects {
		display: flex;
		flex-direction: column;
		gap: map.get($spacers, 1);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	&__project {
		display: flex;
		align-items: center;
		gap: map.get($spacers, 3);
		padding: map.get($spacers, 2) map.get($spacers, 3);
		border-radius: var(--mt-radius-sm);
		font-size: map.get($font-sizes, 6);
		transition: background-color 0.18s var(--mt-ease);

		&:hover {
			background: var(--mt-color-gray-50);
		}
	}

	&__project-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__project-count {
		color: var(--mt-color-gray-400);
		font-size: map.get($font-sizes, 7);
		font-variant-numeric: tabular-nums;
	}

	&__stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: map.get($spacers, 4);
	}

	&__stat {
		--stat-color: var(--mt-color-primary);
		--stat-bg: var(--mt-color-primary-light);

		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-areas:
			"icon value"
			"label label";
		align-items: center;
		gap: map.get($spacers, 2) map.get($spacers, 3);
		padding: map.get($spacers, 4);

		&--warning {
			--stat-color: var(--mt-color-warning);
			--stat-bg: var(--mt-color-warning-light);
		}

		&--success {
			--stat-color: var(--mt-color-success);
			--stat-bg: var(--mt-color-success-light);
		}

		&--danger {
			--stat-color: var(--mt-color-danger);
			--stat-bg: var(--mt-color-danger-light);
		}
	}

	&__stat-icon {
		display: grid;
		grid-area: icon;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--stat-bg);
		color: var(--stat-color);
	}

	&__stat-value {
		grid-area: value;
		font-size: map.get($font-sizes, 1);
		font-weight: 700;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}

	&__stat-label {
		grid-area: label;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 7);
	}

	&__percent {
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 7);

		strong {
			color: var(--mt-color-text);
		}
	}

	&__bar {
		display: flex;
		height: 10px;
		overflow: hidden;
		border-radius: 99px;
		background: var(--mt-color-gray-100);
		gap: 2px;

		&--empty {
			opacity: 0.6;
		}
	}

	&__bar-segment {
		min-width: 4px;
		transition: width 0.4s var(--mt-ease);
	}

	&__legend {
		display: flex;
		flex-wrap: wrap;
		gap: map.get($spacers, 2) map.get($spacers, 5);
		margin: map.get($spacers, 4) 0 0;
		padding: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 7);
		list-style: none;

		li {
			display: inline-flex;
			align-items: center;
			gap: map.get($spacers, 2);
		}

		strong {
			color: var(--mt-color-text);
			font-variant-numeric: tabular-nums;
		}
	}

	&__deadlines {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;

		li + li {
			border-top: 1px solid var(--mt-color-gray-100);
		}
	}

	&__deadline {
		display: flex;
		align-items: center;
		gap: map.get($spacers, 4);
		width: 100%;
		padding: map.get($spacers, 3) map.get($spacers, 2);
		border: 0;
		border-radius: var(--mt-radius-sm);
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.18s var(--mt-ease);

		&:hover {
			background: var(--mt-color-gray-50);
		}
	}

	&__deadline-main {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	&__deadline-title {
		overflow: hidden;
		font-size: map.get($font-sizes, 6);
		font-weight: 550;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__deadline-date {
		flex-shrink: 0;
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 7);
		font-variant-numeric: tabular-nums;

		&--overdue {
			color: var(--mt-color-danger);
			font-weight: 600;
		}
	}

	&__table {
		margin-top: map.get($spacers, 4);
	}

	:deep(.el-form-item) {
		margin-bottom: 0;
	}
}

@media (max-width: 1100px) {
	.profile-page__stats {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 900px) {
	.profile-page__layout {
		grid-template-columns: minmax(0, 1fr);
	}
}

@media (max-width: 560px) {
	.profile-page__hero-body {
		flex-direction: column;
		align-items: flex-start;
	}

	.profile-page__deadline {
		flex-wrap: wrap;
	}
}
</style>
