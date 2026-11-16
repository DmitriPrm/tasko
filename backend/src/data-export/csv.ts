/**
 * CSV для Excel: разделитель «;» (так его ждёт русская версия Excel) и BOM, чтобы кириллица
 * открывалась без ручного выбора кодировки.
 */
export function toCsv(header: string[], rows: (string | number | boolean | null | undefined)[][]) {
	const cell = (value: string | number | boolean | null | undefined) => {
		if (value === null || value === undefined) return "";
		const text = String(value);
		// Формулы в ячейках опасны: «=…» Excel выполнит как формулу (CSV-инъекция)
		const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
		return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
	};
	const lines = [header, ...rows].map((row) => row.map(cell).join(";"));
	return `\uFEFF${lines.join("\r\n")}\r\n`;
}
