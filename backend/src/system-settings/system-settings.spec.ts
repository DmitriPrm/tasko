import { defaultSettings, mergeSection } from "./system-settings";

describe("system settings", () => {
	const defaults = defaultSettings({ reminderHours: 48 });

	it("takes the reminder window from the environment by default", () => {
		expect(defaults.deadlines.reminderHours).toBe(48);
		expect(defaultSettings().deadlines.reminderHours).toBe(24);
	});

	it("merges a partial change into the section", () => {
		expect(mergeSection("risk", defaults.risk, { highThreshold: 0.8 })).toMatchObject({
			mediumThreshold: 0.4,
			highThreshold: 0.8,
		});
	});

	it("rejects thresholds in the wrong order and unknown fields", () => {
		expect(() => mergeSection("risk", defaults.risk, { mediumThreshold: 0.8, highThreshold: 0.6 })).toThrow(
			"Порог высокого риска должен быть больше порога среднего",
		);
		expect(() => mergeSection("ml", defaults.ml, { url: "http://evil" })).toThrow("неизвестные поля url");
	});

	it("normalizes email domains and rejects invalid ones", () => {
		expect(
			mergeSection("registration", defaults.registration, {
				allowedDomains: ["@Company.RU", "company.ru", " uni.edu "],
			}).allowedDomains,
		).toEqual(["company.ru", "uni.edu"]);
		expect(() => mergeSection("registration", defaults.registration, { allowedDomains: ["not a domain"] })).toThrow(
			"Некорректный домен",
		);
	});

	it("accepts only supported attachment types within the hard size limit", () => {
		expect(() => mergeSection("attachments", defaults.attachments, { maxSizeMb: 500 })).toThrow("Размер файла");
		expect(() =>
			mergeSection("attachments", defaults.attachments, { allowedTypes: ["application/x-msdownload"] }),
		).toThrow("Неподдерживаемые типы");
		expect(() => mergeSection("attachments", defaults.attachments, { allowedTypes: [] })).toThrow("хотя бы один");
	});
});
