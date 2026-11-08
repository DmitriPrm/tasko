import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import type { TaskForecast as Forecast } from "@/shared/api/v0/schemas";

import TaskForecast from "./TaskForecast.vue";

const refresh = vi.fn();
vi.mock("@/shared/api/baseApi", () => ({
	baseApi: { tasks: { refreshTaskPrediction: (...args: unknown[]) => refresh(...args) } },
}));

const base: Forecast = {
	source: "RULES",
	durationDays: 3,
	durationHours: 72,
	riskProbability: 0.48,
	riskLevel: "MEDIUM",
	calculatedAt: "2026-11-08T10:00:00.000Z",
	inputs: [],
	factors: ["SHORT_BUFFER"],
	riskFactors: [],
	durationFactors: [],
	models: null,
};

const mountForecast = (forecast: Forecast) =>
	mount(TaskForecast, {
		props: { taskId: "t1", forecast },
		global: {
			stubs: {
				BaseFlex: { template: "<div><slot /></div>" },
				BaseButton: { template: "<button @click=\"$emit('click')\"><slot /></button>" },
				ElTag: { template: "<span><slot /></span>" },
			},
		},
	});

describe("TaskForecast", () => {
	it("explains that a rule-based estimate is not a model forecast", () => {
		const text = mountForecast(base).text();
		expect(text).toContain("По правилам");
		expect(text).toContain("48%");
		expect(text).toContain("≈ 3 дн. (72 ч)");
		expect(text).toContain("Запас по сроку небольшой");
	});

	it("shows the model's factors with their direction", () => {
		const wrapper = mountForecast({
			...base,
			source: "ML",
			durationHours: 5.4,
			riskProbability: 0.81,
			riskLevel: "HIGH",
			factors: [],
			riskFactors: [
				{ feature: "deadline_horizon_hours", label: "Время до срока", impact: 0.21, value: 40 },
				{ feature: "priority", label: "Приоритет", impact: 0.001, value: "LOW" },
			],
			durationFactors: [
				{ feature: "type", label: "Тип задачи", impact: -3.2, value: "BUG" },
				{ feature: "has_assignee", label: "Есть исполнитель", impact: 7, value: 0 },
				{ feature: "assignee_overdue_rate", label: "Доля просрочек у исполнителя", impact: 2, value: null },
			],
			models: { duration: "duration-v1", risk: "risk-v1" },
		});
		const text = wrapper.text();

		expect(text).toContain("Модель ML");
		expect(text).toContain("≈ 5 ч");
		expect(text).toContain("Время до срока");
		expect(text).toContain("+21%");
		expect(text).toContain("−3 ч");
		expect(text).toContain("risk-v1");
		expect(text).toContain("Нет исполнителя");
		expect(text).toContain("Доля просрочек у исполнителя (нет данных)");
		expect(text).not.toContain("Приоритет");
		expect(text).not.toContain("правилам");
	});

	it("keeps the previous forecast when the service is unavailable", async () => {
		refresh.mockResolvedValue({ data: { data: { forecast: base, mlEnabled: true, refreshed: false, history: [] } } });
		const wrapper = mountForecast(base);
		await wrapper.find("button").trigger("click");
		await vi.waitFor(() => expect(refresh).toHaveBeenCalledWith({ id: "t1" }));
		expect(wrapper.emitted("refreshed")).toBeUndefined();
	});
});
