import { toCsv } from "./csv";

describe("toCsv", () => {
	it("adds a BOM, uses semicolons and quotes values that need it", () => {
		const csv = toCsv(
			["a", "b"],
			[
				["Задача; срочная", 'Сказал "да"'],
				[null, 5],
			],
		);
		expect(csv.startsWith("\uFEFF")).toBe(true);
		expect(csv).toBe('\uFEFFa;b\r\n"Задача; срочная";"Сказал ""да"""\r\n;5\r\n');
	});

	it("neutralizes values Excel would run as formulas", () => {
		expect(toCsv(["x"], [["=HYPERLINK(1)"]])).toContain("'=HYPERLINK(1)");
		expect(toCsv(["x"], [["-5"]])).toContain("'-5");
	});
});
