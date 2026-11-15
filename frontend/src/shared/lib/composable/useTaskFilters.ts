import { computed, reactive } from "vue";

import type { TaskPriority, TaskStatus, TaskType } from "@/shared/api/v0/schemas";
import { matchesRisk, type RiskLevel } from "@/shared/lib/helpers/forecast";
import { type DeadlineFilter, matchesDeadline } from "@/shared/lib/helpers/formatDate";
import { priorityLabel, statusLabel, typeLabel } from "@/shared/lib/helpers/labels";
import { translate } from "@/shared/lib/theming/i18n/translate";

/** Открытые — не выполненные и не отменённые; закрытые — наоборот */
export type TaskState = "open" | "closed" | "all";

export interface TaskFilterState {
	state: TaskState;
	status: TaskStatus | "";
	type: TaskType | "";
	priority: TaskPriority | "";
	assigneeId: string;
	tagId: string;
	projectId: string;
	deadline: DeadlineFilter;
	risk: RiskLevel | "";
}

export type TaskFilterField = keyof TaskFilterState;

const EMPTY: TaskFilterState = {
	state: "all",
	status: "",
	type: "",
	priority: "",
	assigneeId: "",
	tagId: "",
	projectId: "",
	deadline: "",
	risk: "",
};

export interface FilterableTask {
	status: string;
	type: string;
	priority: string;
	isCompleted?: boolean | null;
	assigneeId?: string | null;
	deadlineAt?: string | null;
	tags?: { id: string }[] | null;
	project?: { id: string } | null;
	projectId?: string;
	forecast?: Parameters<typeof matchesRisk>[0]["forecast"];
}

/** Подписи для выбранных значений, которые нельзя взять из словаря: люди, теги, проекты */
export interface FilterLookups {
	users?: { id: string; fullName: string }[];
	tags?: { id: string; name: string }[];
	projects?: { id: string; name: string }[];
}

export interface FilterChip {
	field: TaskFilterField;
	label: string;
}

const isClosed = (task: FilterableTask) =>
	Boolean(task.isCompleted) || task.status === "DONE" || task.status === "CANCELLED";

/**
 * Состояние фильтров задач: одно на страницу, общее для кнопки «Фильтры» и строки активных фильтров.
 * defaults — значения «без фильтра» для этой страницы (например, на «Задачах» по умолчанию только открытые).
 */
export function useTaskFilters(defaults: Partial<TaskFilterState> = {}, lookups: () => FilterLookups = () => ({})) {
	const base: TaskFilterState = { ...EMPTY, ...defaults };
	const state = reactive<TaskFilterState>({ ...base });

	const set = <K extends TaskFilterField>(field: K, value: TaskFilterState[K] | null | undefined) => {
		state[field] = (value ?? base[field]) as TaskFilterState[K];
	};
	const clear = (field: TaskFilterField) => set(field, base[field]);
	const reset = () => Object.assign(state, base);

	const isActive = (field: TaskFilterField) => state[field] !== base[field];
	const activeFields = computed(() => (Object.keys(base) as TaskFilterField[]).filter(isActive));
	const count = computed(() => activeFields.value.length);

	const matches = (task: FilterableTask) => {
		if (state.state === "open" && isClosed(task)) return false;
		if (state.state === "closed" && !isClosed(task)) return false;
		if (state.status && task.status !== state.status) return false;
		if (state.type && task.type !== state.type) return false;
		if (state.priority && task.priority !== state.priority) return false;
		if (state.assigneeId && task.assigneeId !== state.assigneeId) return false;
		if (state.tagId && !(task.tags ?? []).some((tag) => tag.id === state.tagId)) return false;
		if (state.projectId && (task.project?.id ?? task.projectId) !== state.projectId) return false;
		if (!matchesDeadline(task, state.deadline)) return false;
		if (!matchesRisk({ status: task.status, isCompleted: task.isCompleted, forecast: task.forecast }, state.risk)) {
			return false;
		}
		return true;
	};

	const valueLabel = (field: TaskFilterField): string => {
		const value = state[field];
		const found = lookups();
		switch (field) {
			case "state":
				return translate(`filters.state.${value}`);
			case "status":
				return statusLabel(value);
			case "type":
				return typeLabel(value);
			case "priority":
				return priorityLabel(value);
			case "deadline":
				return translate(`task.deadlineFilter.${value}`);
			case "risk":
				return translate(`forecast.${String(value).toLowerCase()}`);
			case "assigneeId":
				return found.users?.find((user) => user.id === value)?.fullName ?? "…";
			case "tagId":
				return found.tags?.find((tag) => tag.id === value)?.name ?? "…";
			case "projectId":
				return found.projects?.find((project) => project.id === value)?.name ?? "…";
		}
	};

	const chips = computed<FilterChip[]>(() =>
		activeFields.value.map((field) => ({
			field,
			label: `${translate(`filters.field.${field}`)}: ${valueLabel(field)}`,
		})),
	);

	return { state, set, clear, reset, count, chips, matches, isActive };
}

export type TaskFilters = ReturnType<typeof useTaskFilters>;
