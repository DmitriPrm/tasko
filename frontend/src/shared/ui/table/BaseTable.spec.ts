import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import { PRIORITY_RANK } from "@/shared/lib/helpers/labels";

import BaseTable, { type BaseTableColumn } from "./BaseTable.vue";

// Таблица подтягивает сохранённую ширину колонок; в тесте сеть не нужна
vi.mock("@/shared/api/baseApi", () => {
	const empty = vi.fn().mockResolvedValue({ data: { data: { widths: {} } } });
	return { baseApi: { tableLayouts: { getTableLayout: empty, saveTableLayout: empty } } };
});

const rows = [
	{ id: "1", title: "Б", priority: "HIGH" },
	{ id: "2", title: "В", priority: "LOW" },
	{ id: "3", title: "А", priority: "CRITICAL" },
	{ id: "4", title: "Г", priority: "MEDIUM" },
];

const columns: BaseTableColumn[] = [
	{ key: "title", label: "Название" },
	{ key: "priority", label: "Приоритет", sortValue: (row) => PRIORITY_RANK[row.priority] },
];

const mountTable = () =>
	mount(BaseTable, {
		props: { rows, columns, code: "test" },
		global: {
			stubs: {
				BaseFlex: { template: "<div><slot /></div>" },
				ElSelect: true,
				ElOption: true,
			},
			mocks: { translate: (key: string) => key },
		},
	});

const firstColumn = (wrapper: ReturnType<typeof mountTable>) =>
	wrapper.findAll("tbody tr").map((row) => row.find("td").text());

describe("BaseTable sorting", () => {
	it("sorts text columns alphabetically", async () => {
		const wrapper = mountTable();
		await wrapper.findAll("thead button")[0].trigger("click");
		expect(firstColumn(wrapper)).toEqual(["А", "Б", "В", "Г"]);
	});

	it("uses the column sortValue instead of alphabetical order", async () => {
		const wrapper = mountTable();
		const priorityHeader = wrapper.findAll("thead button")[1];

		await priorityHeader.trigger("click");
		expect(firstColumn(wrapper)).toEqual(["В", "Г", "Б", "А"]);

		await priorityHeader.trigger("click");
		expect(firstColumn(wrapper)).toEqual(["А", "Б", "Г", "В"]);
	});
});
