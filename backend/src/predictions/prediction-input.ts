import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Что получает ML-сервис (ml/tasko_ml/schema.py → TaskInput). Имён и email здесь нет.
 * Агрегаты считаются так же, как при обучении (ml/tasko_ml/dataset.py), иначе модель увидит
 * в работе не те признаки, на которых училась.
 */
export interface MlTaskInput {
	type: TaskType;
	priority: TaskPriority;
	title: string;
	description: string;
	created_at: string;
	deadline_at: string | null;
	planned_start_at: string | null;
	is_subtask: boolean;
	tags_count: number;
	blocked_by_count: number;
	has_assignee: boolean;
	assignee_active_tasks: number;
	assignee_done_count: number;
	assignee_avg_duration_hours: number | null;
	assignee_overdue_rate: number | null;
	project_done_count: number;
	project_avg_duration_hours: number | null;
	project_overdue_rate: number | null;
}

/** Задача из истории исполнителя или проекта */
export interface HistoryTask {
	id: string;
	status: TaskStatus;
	createdAt: Date;
	actualStartAt: Date | null;
	completedAt: Date | null;
	deadlineAt: Date | null;
	/** Первый переход в «В работе» — если actualStartAt не заполнен */
	firstProgressAt?: Date | null;
	/** Когда задачу отменили */
	cancelledAt?: Date | null;
}

export interface HistoryStats {
	done: number;
	active: number;
	avgDuration: number | null;
	overdueRate: number | null;
}

export interface PredictionSubject {
	id: string;
	type: TaskType;
	priority: TaskPriority;
	title: string;
	description: string | null;
	deadlineAt: Date | null;
	plannedStartAt: Date | null;
	parentTaskId: string | null;
	assigneeId: string | null;
	tagsCount: number;
	openBlockersCount: number;
}

/** Часы работы: от начала (или первого «В работе») до «Готово». null, если посчитать нельзя */
export function durationHours(task: HistoryTask): number | null {
	if (task.status !== TaskStatus.DONE || !task.completedAt) return null;
	const start = task.actualStartAt ?? task.firstProgressAt ?? null;
	if (!start) return null;
	const hours = (task.completedAt.getTime() - start.getTime()) / HOUR_MS;
	return hours > 0 ? hours : null;
}

/** Срок — это день, поэтому закрыть задачу в течение дня срока — вовремя */
export function deadlineMissed(task: HistoryTask): boolean | null {
	if (task.status !== TaskStatus.DONE || !task.completedAt || !task.deadlineAt) return null;
	return task.completedAt.getTime() >= task.deadlineAt.getTime() + DAY_MS;
}

/** Агрегаты по задачам, известные к моменту moment. Саму задачу (excludeId) не учитываем */
export function historyStats(tasks: HistoryTask[], moment: Date, excludeId?: string): HistoryStats {
	const at = moment.getTime();
	const others = tasks.filter((task) => task.id !== excludeId);
	const doneBefore = others.filter(
		(task) => task.status === TaskStatus.DONE && task.completedAt && task.completedAt.getTime() < at,
	);
	const durations = doneBefore.map(durationHours).filter((value): value is number => value !== null);
	const missed = doneBefore.map(deadlineMissed).filter((value): value is boolean => value !== null);
	const active = others.filter((task) => {
		if (task.createdAt.getTime() >= at) return false;
		const finishedAt = task.status === TaskStatus.DONE ? task.completedAt : (task.cancelledAt ?? null);
		if (task.status === TaskStatus.CANCELLED && !finishedAt) return false;
		return !finishedAt || finishedAt.getTime() > at;
	});

	return {
		done: doneBefore.length,
		active: active.length,
		avgDuration: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null,
		overdueRate: missed.length ? missed.filter(Boolean).length / missed.length : null,
	};
}

/**
 * Вход для модели. Момент прогноза — «сейчас»: время до срока и история исполнителя считаются
 * на момент пересчёта, а не на момент создания задачи.
 */
export function buildPredictionInput(
	task: PredictionSubject,
	assigneeHistory: HistoryTask[] | null,
	projectHistory: HistoryTask[],
	moment: Date = new Date(),
): MlTaskInput {
	const assignee = task.assigneeId && assigneeHistory ? historyStats(assigneeHistory, moment, task.id) : null;
	const project = historyStats(projectHistory, moment, task.id);
	const round = (value: number | null) => (value === null ? null : Math.round(value * 1000) / 1000);

	return {
		type: task.type,
		priority: task.priority,
		title: task.title,
		description: task.description ?? "",
		created_at: moment.toISOString(),
		deadline_at: task.deadlineAt?.toISOString() ?? null,
		planned_start_at: task.plannedStartAt?.toISOString() ?? null,
		is_subtask: Boolean(task.parentTaskId),
		tags_count: task.tagsCount,
		blocked_by_count: task.openBlockersCount,
		has_assignee: Boolean(assignee),
		assignee_active_tasks: assignee?.active ?? 0,
		assignee_done_count: assignee?.done ?? 0,
		assignee_avg_duration_hours: round(assignee?.avgDuration ?? null),
		assignee_overdue_rate: round(assignee?.overdueRate ?? null),
		project_done_count: project.done,
		project_avg_duration_hours: round(project.avgDuration),
		project_overdue_rate: round(project.overdueRate),
	};
}
