import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/ru";

import { i18n } from "@/shared/lib/theming/i18n/translate";

export const DATE_FIELD_FORMAT = "D MMMM YYYY";
export const DATETIME_FIELD_FORMAT = "D MMMM YYYY, HH:mm";

function currentLocale() {
	return i18n.global.locale.value === "en" ? "en" : "ru";
}

export function formatDate(value?: string | null) {
	if (!value) return "";
	return dayjs(value).locale(currentLocale()).format(DATE_FIELD_FORMAT);
}

export function formatDateTime(value?: string | null) {
	if (!value) return "";
	return dayjs(value).locale(currentLocale()).format(DATETIME_FIELD_FORMAT);
}

export function isOverdue(value?: string | null) {
	if (!value) return false;
	return dayjs(value).isBefore(dayjs(), "day");
}

/** Дата из поля "YYYY-MM-DD" -> ISO начала дня в локальном часовом поясе (без сдвига на сутки) */
export function toIsoDate(value?: string | null) {
	if (!value) return null;
	return dayjs(value, "YYYY-MM-DD").startOf("day").toISOString();
}

/** Просрочена только незавершённая задача */
export function isTaskOverdue(task: { deadlineAt?: string | null; status: string; isCompleted?: boolean }) {
	if (task.isCompleted || task.status === "DONE" || task.status === "CANCELLED") return false;
	return isOverdue(task.deadlineAt);
}

export type DeadlineFilter = "" | "overdue" | "today" | "week" | "none";
export const DEADLINE_FILTERS: Exclude<DeadlineFilter, "">[] = ["overdue", "today", "week", "none"];

type DeadlineTask = { deadlineAt?: string | null; status?: string; isCompleted?: boolean | null };

/** Фильтр по сроку: просрочена, сегодня, ближайшие 7 дней (включая сегодня) или без срока */
export function matchesDeadline(task: DeadlineTask, filter: DeadlineFilter, now = dayjs()) {
	if (!filter) return true;
	if (filter === "overdue") {
		return isTaskOverdue({
			deadlineAt: task.deadlineAt,
			status: task.status ?? "",
			isCompleted: Boolean(task.isCompleted),
		});
	}
	if (filter === "none") return !task.deadlineAt;
	if (!task.deadlineAt) return false;
	const deadline = dayjs(task.deadlineAt);
	if (filter === "today") return deadline.isSame(now, "day");
	return !deadline.isBefore(now, "day") && !deadline.isAfter(now.add(7, "day"), "day");
}
