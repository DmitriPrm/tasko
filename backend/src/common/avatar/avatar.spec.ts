import { getAvatarColor, getInitials } from "./avatar";

describe("getInitials", () => {
	it("takes first letters of first and last name", () => {
		expect(getInitials("Ирина Петрова")).toBe("ИП");
	});

	it("uses two letters when there is one word", () => {
		expect(getInitials("Admin")).toBe("AD");
	});

	it("returns fallback for empty name", () => {
		expect(getInitials("   ")).toBe("?");
	});
});

describe("getAvatarColor", () => {
	it("returns a stable color for the same seed", () => {
		expect(getAvatarColor("user-1")).toBe(getAvatarColor("user-1"));
	});

	it("can return different colors for different seeds", () => {
		expect(getAvatarColor("aaa")).not.toBe(getAvatarColor("bbb"));
	});
});
