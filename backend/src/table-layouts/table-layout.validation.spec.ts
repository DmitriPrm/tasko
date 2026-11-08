import { BadRequestException } from "@nestjs/common";
import { validate } from "class-validator";

import { SaveTableLayoutDto } from "./dto/save-table-layout.dto";
import { assertColumnWidths, assertTableCode } from "./table-layout.validation";

describe("table layout validation", () => {
	it("accepts a short table code", () => {
		expect(assertTableCode("settings-fields")).toBe("settings-fields");
	});

	it("rejects empty, uppercase, and path-like codes", () => {
		expect(() => assertTableCode("")).toThrow(BadRequestException);
		expect(() => assertTableCode("Users")).toThrow(BadRequestException);
		expect(() => assertTableCode("../users")).toThrow(BadRequestException);
		expect(() => assertTableCode("users/admin")).toThrow(BadRequestException);
		expect(() => assertTableCode(`a${"b".repeat(64)}`)).toThrow(BadRequestException);
	});

	it("accepts column keys mapped to pixel widths", () => {
		expect(assertColumnWidths({ fullName: 180, ADMIN: 140, deadlineAt: 160 })).toEqual({
			fullName: 180,
			ADMIN: 140,
			deadlineAt: 160,
		});
	});

	it("rejects bad keys and non-positive widths", () => {
		expect(() => assertColumnWidths([])).toThrow(BadRequestException);
		expect(() => assertColumnWidths({ "../x": 100 })).toThrow(BadRequestException);
		expect(() => assertColumnWidths({ title: 47 })).toThrow(BadRequestException);
		expect(() => assertColumnWidths({ title: 1201 })).toThrow(BadRequestException);
		expect(() => assertColumnWidths({ title: 100.5 })).toThrow(BadRequestException);
		expect(() => assertColumnWidths({ title: -20 })).toThrow(BadRequestException);
	});

	it("validates the save dto", async () => {
		const dto = new SaveTableLayoutDto();
		dto.widths = { title: 240 };
		await expect(validate(dto)).resolves.toHaveLength(0);

		dto.widths = { "a/b": 100 } as Record<string, number>;
		const errors = await validate(dto);
		expect(errors.length).toBeGreaterThan(0);
	});
});
