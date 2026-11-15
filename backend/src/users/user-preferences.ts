import { BadRequestException } from "@nestjs/common";
import { NotificationType } from "@prisma/client";

/** Каналы доставки уведомления одного типа */
export interface ChannelPrefs {
	inApp: boolean;
	email: boolean;
}

/** Личные настройки пользователя (поле users.preferences) */
export interface UserPreferences {
	notifications: Record<NotificationType, ChannelPrefs>;
	/** Куда попадать после входа */
	startPage: "dashboard" | "tasks" | "projects";
	/** Вид проекта; null — как задано в системных настройках */
	projectView: "board" | "list" | null;
	/** Показывать закрытые задачи в «Моих задачах» по умолчанию */
	showClosedTasks: boolean;
}

export const NOTIFICATION_TYPES = Object.values(NotificationType);

/** Приглашение в проект нельзя отключить внутри системы: без него не принять приглашение */
export const REQUIRED_IN_APP: NotificationType[] = [NotificationType.PROJECT_INVITATION];

export function defaultPreferences(): UserPreferences {
	return {
		notifications: Object.fromEntries(
			NOTIFICATION_TYPES.map((type) => [type, { inApp: true, email: false }]),
		) as Record<NotificationType, ChannelPrefs>,
		startPage: "dashboard",
		projectView: null,
		showClosedTasks: false,
	};
}

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Сохранённые настройки поверх значений по умолчанию; мусор из базы игнорируется */
export function readPreferences(stored: unknown): UserPreferences {
	const prefs = defaultPreferences();
	if (!isObject(stored)) return prefs;
	try {
		return mergePreferences(prefs, stored);
	} catch {
		return prefs;
	}
}

/** Применить изменения с проверкой: неизвестные поля и значения отклоняются */
export function mergePreferences(current: UserPreferences, patch: unknown): UserPreferences {
	if (!isObject(patch)) throw new BadRequestException("Ожидается объект настроек");
	const next: UserPreferences = structuredClone(current);
	const allowed = ["notifications", "startPage", "projectView", "showClosedTasks"];
	const unknown = Object.keys(patch).filter((key) => !allowed.includes(key));
	if (unknown.length) throw new BadRequestException(`Неизвестные настройки: ${unknown.join(", ")}`);

	if (patch.notifications !== undefined) {
		if (!isObject(patch.notifications)) throw new BadRequestException("Уведомления: ожидается объект");
		for (const [type, value] of Object.entries(patch.notifications)) {
			if (!NOTIFICATION_TYPES.includes(type as NotificationType)) {
				throw new BadRequestException(`Неизвестный тип уведомления: ${type}`);
			}
			if (!isObject(value)) throw new BadRequestException(`Уведомления ${type}: ожидается объект`);
			const channel = next.notifications[type as NotificationType];
			for (const key of ["inApp", "email"] as const) {
				if (value[key] === undefined) continue;
				if (typeof value[key] !== "boolean") throw new BadRequestException(`Уведомления ${type}.${key}: да/нет`);
				channel[key] = value[key] as boolean;
			}
			if (REQUIRED_IN_APP.includes(type as NotificationType)) channel.inApp = true;
		}
	}
	if (patch.startPage !== undefined) {
		if (!["dashboard", "tasks", "projects"].includes(patch.startPage as string)) {
			throw new BadRequestException("Стартовая страница");
		}
		next.startPage = patch.startPage as UserPreferences["startPage"];
	}
	if (patch.projectView !== undefined) {
		if (![null, "board", "list"].includes(patch.projectView as string | null)) {
			throw new BadRequestException("Вид проекта");
		}
		next.projectView = patch.projectView as UserPreferences["projectView"];
	}
	if (patch.showClosedTasks !== undefined) {
		if (typeof patch.showClosedTasks !== "boolean") throw new BadRequestException("Закрытые задачи: да/нет");
		next.showClosedTasks = patch.showClosedTasks;
	}
	return next;
}
