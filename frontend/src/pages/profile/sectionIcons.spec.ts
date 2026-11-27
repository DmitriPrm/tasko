import { describe, expect, it } from "vitest";

import { DEFAULT_SECTION_ICON, sectionIconKey } from "./sectionIcons";

describe("sectionIconKey", () => {
	it("uses the icon the owner picked", () => {
		expect(sectionIconKey({ title: "Достижения", icon: "heart" })).toBe("heart");
	});

	it("guesses the icon from the section title", () => {
		expect(sectionIconKey({ title: "Достижения" })).toBe("award");
		expect(sectionIconKey({ title: "Образование" })).toBe("book");
		expect(sectionIconKey({ title: "Контакты", icon: null })).toBe("phone");
	});

	it("falls back to the drawn medal for anything else", () => {
		expect(sectionIconKey({ title: "Разное" })).toBe(DEFAULT_SECTION_ICON);
		expect(sectionIconKey({ title: "Разное", icon: "unknown" })).toBe(DEFAULT_SECTION_ICON);
	});
});
