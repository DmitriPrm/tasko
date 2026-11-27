import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { RISK_THRESHOLDS } from "../tasks/forecast";
import { defaultSettings, mergeSection, SETTINGS_SECTIONS, SettingsSection, SystemSettings } from "./system-settings";

/**
 * Системные настройки: значения по умолчанию + сохранённые администратором (таблица system_settings,
 * по строке на раздел). Читаются из памяти, поэтому их можно спрашивать на каждом запросе.
 */
@Injectable()
export class SystemSettingsService implements OnModuleInit {
	private cache: SystemSettings;

	constructor(
		private readonly prisma: PrismaService,
		private readonly config: ConfigService,
	) {
		this.cache = this.defaults();
	}

	async onModuleInit() {
		await this.reload();
	}

	/** Текущие настройки (копия, чтобы снаружи их нельзя было случайно изменить) */
	get(): SystemSettings {
		return structuredClone(this.cache);
	}

	section<K extends SettingsSection>(key: K): SystemSettings[K] {
		return structuredClone(this.cache[key]);
	}

	async reload() {
		const rows = await this.prisma.systemSetting.findMany();
		const next = this.defaults();
		for (const row of rows) {
			const key = row.key as SettingsSection;
			if (!SETTINGS_SECTIONS.includes(key)) continue;
			try {
				// Сохранённое значение проверяем так же, как при записи: битая строка не ломает систему
				(next as unknown as Record<string, unknown>)[key] = mergeSection(key, next[key], row.value);
			} catch {
				// Остаётся значение по умолчанию
			}
		}
		this.apply(next);
	}

	/** Сохранить изменения нескольких разделов сразу; возвращает настройки целиком */
	async update(patch: Record<string, unknown>, actorId: string) {
		const keys = Object.keys(patch);
		const unknown = keys.filter((key) => !SETTINGS_SECTIONS.includes(key as SettingsSection));
		if (unknown.length) throw new BadRequestException(`Неизвестные разделы: ${unknown.join(", ")}`);

		const next = this.get();
		for (const key of keys as SettingsSection[]) {
			(next as unknown as Record<string, unknown>)[key] = mergeSection(key, next[key], patch[key]);
		}

		await this.prisma.$transaction(
			(keys as SettingsSection[]).map((key) =>
				this.prisma.systemSetting.upsert({
					where: { key },
					update: { value: next[key] as unknown as Prisma.InputJsonValue, updatedById: actorId },
					create: { key, value: next[key] as unknown as Prisma.InputJsonValue, updatedById: actorId },
				}),
			),
		);
		this.apply(next);
		return this.get();
	}

	/** Что нужно знать интерфейсу каждого пользователя (без административных деталей) */
	publicSettings() {
		const { risk, attachments, projects, registration } = this.cache;
		return {
			risk: { mediumThreshold: risk.mediumThreshold, highThreshold: risk.highThreshold },
			attachments: { maxSizeMb: attachments.maxSizeMb, allowedTypes: [...attachments.allowedTypes] },
			projects: { ...projects },
			registration: { open: registration.open, allowedDomains: [...registration.allowedDomains] },
		};
	}

	private defaults() {
		return defaultSettings({ reminderHours: Number(this.config.get("DEADLINE_REMINDER_HOURS")) });
	}

	private apply(next: SystemSettings) {
		this.cache = next;
		// Прогноз считается чистой функцией без доступа к сервисам — пороги передаём через общий объект
		RISK_THRESHOLDS.medium = next.risk.mediumThreshold;
		RISK_THRESHOLDS.high = next.risk.highThreshold;
	}
}
