import { defaultPreferences, mergePreferences, readPreferences } from "./user-preferences";

describe("user preferences", () => {
	it("shows everything in the app and nothing by email by default", () => {
		const prefs = defaultPreferences();
		expect(prefs.notifications.HIGH_RISK).toEqual({ inApp: true, email: false });
		expect(prefs.startPage).toBe("dashboard");
	});

	it("merges a partial change and keeps project invitations in the app", () => {
		const next = mergePreferences(defaultPreferences(), {
			startPage: "tasks",
			notifications: { STATUS_CHANGED: { inApp: false }, PROJECT_INVITATION: { inApp: false, email: true } },
		});
		expect(next.startPage).toBe("tasks");
		expect(next.notifications.STATUS_CHANGED).toEqual({ inApp: false, email: false });
		expect(next.notifications.PROJECT_INVITATION).toEqual({ inApp: true, email: true });
	});

	it("rejects unknown settings and ignores broken stored data", () => {
		expect(() => mergePreferences(defaultPreferences(), { theme: "dark" })).toThrow("Неизвестные настройки");
		expect(() => mergePreferences(defaultPreferences(), { notifications: { SPAM: { inApp: true } } })).toThrow(
			"Неизвестный тип",
		);
		expect(readPreferences({ startPage: "nowhere" }).startPage).toBe("dashboard");
	});
});
