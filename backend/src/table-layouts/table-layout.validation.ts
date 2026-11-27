import { BadRequestException } from "@nestjs/common";

export const TABLE_CODE_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
export const COLUMN_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
export const MIN_COLUMN_WIDTH = 48;
export const MAX_COLUMN_WIDTH = 1200;
export const MAX_COLUMN_COUNT = 40;

const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function assertTableCode(code: string): string {
	if (typeof code !== "string" || !TABLE_CODE_PATTERN.test(code)) {
		throw new BadRequestException("Некорректный код таблицы");
	}

	return code;
}

export function assertColumnWidths(value: unknown): Record<string, number> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new BadRequestException("Некорректные ширины колонок");
	}

	const entries = Object.entries(value as Record<string, unknown>);
	if (entries.length > MAX_COLUMN_COUNT) {
		throw new BadRequestException("Слишком много колонок");
	}

	const widths: Record<string, number> = {};
	for (const [key, width] of entries) {
		if (RESERVED_KEYS.has(key) || !COLUMN_KEY_PATTERN.test(key)) {
			throw new BadRequestException("Некорректный ключ колонки");
		}

		if (typeof width !== "number" || !Number.isInteger(width) || width < MIN_COLUMN_WIDTH || width > MAX_COLUMN_WIDTH) {
			throw new BadRequestException("Некорректная ширина колонки");
		}

		widths[key] = width;
	}

	return widths;
}

export function readColumnWidths(value: unknown): Record<string, number> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};

	const widths: Record<string, number> = {};
	for (const [key, width] of Object.entries(value as Record<string, unknown>)) {
		if (RESERVED_KEYS.has(key) || !COLUMN_KEY_PATTERN.test(key)) continue;
		if (typeof width !== "number" || !Number.isInteger(width)) continue;
		if (width < MIN_COLUMN_WIDTH || width > MAX_COLUMN_WIDTH) continue;
		widths[key] = width;
	}

	return widths;
}
