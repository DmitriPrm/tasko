import { Project, ProjectStatus } from "@prisma/client";

import { makeField, option } from "../common/form/form-field";

export function getProjectFields(project?: Project) {
	return [
		makeField({
			code: "name",
			name: "Название",
			type: "text",
			value: project?.name ?? "",
			require: true,
		}),
		makeField({
			code: "description",
			name: "Описание",
			type: "textarea",
			value: project?.description ?? "",
		}),
		makeField({
			code: "status",
			name: "Статус",
			type: "select",
			value: project?.status ?? ProjectStatus.PLANNED,
			require: true,
			possibleValues: [
				option(ProjectStatus.PLANNED, "Подготовка"),
				option(ProjectStatus.ACTIVE, "Активный"),
				option(ProjectStatus.COMPLETED, "Завершён"),
			],
		}),
		makeField({
			code: "plannedStartAt",
			name: "Плановый старт",
			type: "date",
			value: project?.plannedStartAt?.toISOString() ?? null,
		}),
		makeField({
			code: "plannedEndAt",
			name: "Плановое завершение",
			type: "date",
			value: project?.plannedEndAt?.toISOString() ?? null,
		}),
	];
}
