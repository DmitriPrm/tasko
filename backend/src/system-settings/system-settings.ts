import { BadRequestException } from "@nestjs/common";

/**
 * Системные настройки, которые администратор меняет в интерфейсе без перезапуска.
 * То, что не сохранено в базе, берётся из значений по умолчанию (часть — из .env).
 * Секреты (пароль SMTP, JWT) здесь не хранятся: они остаются в .env.
 */
export interface SystemSettings {
	risk: {
		/** Вероятность срыва, начиная с которой риск средний / высокий */
		mediumThreshold: number;
		highThreshold: number;
		/** Уведомлять о высоком риске */
		alertsEnabled: boolean;
		/** Кроме исполнителей уведомлять и менеджеров проекта */
		alertManagers: boolean;
	};
	deadlines: {
		/** За сколько часов до срока напоминать исполнителю */
		reminderHours: number;
	};
	ml: {
		/** Использовать ML-сервис; выключено — прогноз по правилам */
		enabled: boolean;
	};
	registration: {
		/** Можно ли зарегистрироваться без приглашения */
		open: boolean;
		/** Разрешённые домены почты; пусто — любые */
		allowedDomains: string[];
		defaultRole: "EXECUTOR" | "MANAGER";
	};
	attachments: {
		maxSizeMb: number;
		/** Разрешённые MIME-типы из поддерживаемых */
		allowedTypes: string[];
	};
	projects: {
		/** Вид проекта по умолчанию */
		defaultView: "board" | "list";
		/** Строгие переходы статусов: только по схеме К выполнению → В работе → На проверке → Готово */
		strictWorkflow: boolean;
	};
}

export type SettingsSection = keyof SystemSettings;
export const SETTINGS_SECTIONS: SettingsSection[] = [
	"risk",
	"deadlines",
	"ml",
	"registration",
	"attachments",
	"projects",
];

/** Типы файлов, которые система умеет принимать (расширение для хранения) */
export const SUPPORTED_ATTACHMENT_TYPES: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/gif": "gif",
	"image/webp": "webp",
	"application/pdf": "pdf",
	"text/plain": "txt",
	"text/csv": "csv",
	"application/zip": "zip",
	"application/x-zip-compressed": "zip",
	"application/msword": "doc",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
	"application/vnd.ms-excel": "xls",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
	"application/vnd.ms-powerpoint": "ppt",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

/** Жёсткий верхний предел размера файла: защищает сервер от ошибочной настройки */
export const MAX_ATTACHMENT_LIMIT_MB = 50;

export function defaultSettings(env: { reminderHours?: number } = {}): SystemSettings {
	return {
		risk: { mediumThreshold: 0.4, highThreshold: 0.7, alertsEnabled: true, alertManagers: true },
		deadlines: { reminderHours: env.reminderHours && env.reminderHours > 0 ? env.reminderHours : 24 },
		ml: { enabled: true },
		registration: { open: true, allowedDomains: [], defaultRole: "EXECUTOR" },
		attachments: { maxSizeMb: 10, allowedTypes: Object.keys(SUPPORTED_ATTACHMENT_TYPES) },
		projects: { defaultView: "board", strictWorkflow: false },
	};
}

const fail = (message: string): never => {
	throw new BadRequestException(message);
};

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function bool(value: unknown, name: string) {
	return typeof value === "boolean" ? value : fail(`${name}: ожидается да/нет`);
}

function number(value: unknown, name: string, min: number, max: number) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
		return fail(`${name}: число от ${min} до ${max}`);
	}
	return value;
}

/**
 * Проверяет изменения одного раздела и возвращает раздел целиком.
 * Неизвестные поля отклоняются: в настройки не попадёт ничего лишнего.
 */
export function mergeSection<K extends SettingsSection>(
	section: K,
	current: SystemSettings[K],
	patch: unknown,
): SystemSettings[K] {
	if (!isObject(patch)) fail(`Раздел ${section}: ожидается объект`);
	const input = patch as Record<string, unknown>;
	const allowed = Object.keys(current);
	const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
	if (unknown.length) fail(`Раздел ${section}: неизвестные поля ${unknown.join(", ")}`);

	const next = { ...current, ...input } as Record<string, unknown>;
	switch (section) {
		case "risk": {
			const medium = number(next.mediumThreshold, "Порог среднего риска", 0.05, 0.95);
			const high = number(next.highThreshold, "Порог высокого риска", 0.05, 0.99);
			if (high <= medium) fail("Порог высокого риска должен быть больше порога среднего");
			bool(next.alertsEnabled, "Уведомления о высоком риске");
			bool(next.alertManagers, "Уведомлять менеджеров");
			break;
		}
		case "deadlines":
			number(next.reminderHours, "Напоминание о сроке, ч", 1, 24 * 14);
			break;
		case "ml":
			bool(next.enabled, "ML-прогноз");
			break;
		case "registration": {
			bool(next.open, "Открытая регистрация");
			if (!["EXECUTOR", "MANAGER"].includes(next.defaultRole as string)) fail("Роль новых пользователей");
			const domains = next.allowedDomains;
			if (!Array.isArray(domains) || domains.some((item) => typeof item !== "string")) fail("Домены почты");
			next.allowedDomains = [
				...new Set(
					(domains as string[])
						.map((item) => item.trim().toLowerCase().replace(/^@/, ""))
						.filter(Boolean)
						.map((item) => (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(item) ? item : fail(`Некорректный домен: ${item}`))),
				),
			];
			break;
		}
		case "attachments": {
			number(next.maxSizeMb, "Размер файла, МБ", 1, MAX_ATTACHMENT_LIMIT_MB);
			const types = next.allowedTypes;
			if (!Array.isArray(types) || !types.length) fail("Выберите хотя бы один тип файлов");
			const bad = (types as unknown[]).filter((item) => typeof item !== "string" || !SUPPORTED_ATTACHMENT_TYPES[item]);
			if (bad.length) fail(`Неподдерживаемые типы файлов: ${bad.join(", ")}`);
			next.allowedTypes = [...new Set(types as string[])];
			break;
		}
		case "projects":
			if (!["board", "list"].includes(next.defaultView as string)) fail("Вид проекта по умолчанию");
			bool(next.strictWorkflow, "Строгие переходы статусов");
			break;
	}
	return next as SystemSettings[K];
}
