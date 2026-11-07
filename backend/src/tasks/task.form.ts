import { Task, TaskPriority, TaskType, User } from "@prisma/client";

import { makeField, option } from "../common/form/form-field";

export function getTaskFields(options: { task?: Task; members: User[] }) {
	const { task, members } = options;

	return [
		makeField({
			code: "title",
			name: "Название",
			type: "text",
			value: task?.title ?? "",
			require: true,
		}),
		makeField({
			code: "description",
			name: "Описание",
			type: "textarea",
			value: task?.description ?? "",
		}),
		makeField({
			code: "type",
			name: "Тип",
			type: "select",
			value: task?.type ?? TaskType.TASK,
			require: true,
			possibleValues: [
				option(TaskType.TASK, "Задача"),
				option(TaskType.FEATURE, "Фича"),
				option(TaskType.BUG, "Ошибка"),
				option(TaskType.RESEARCH, "Исследование"),
			],
		}),
		makeField({
			code: "priority",
			name: "Приоритет",
			type: "select",
			value: task?.priority ?? TaskPriority.MEDIUM,
			require: true,
			possibleValues: [
				option(TaskPriority.LOW, "Низкий"),
				option(TaskPriority.MEDIUM, "Средний"),
				option(TaskPriority.HIGH, "Высокий"),
				option(TaskPriority.CRITICAL, "Критический"),
			],
		}),
		makeField({
			code: "assigneeId",
			name: "Исполнитель",
			type: "select",
			value: task?.assigneeId ?? null,
			possibleValues: members.map((member) => option(member.id, member.fullName)),
		}),
		makeField({
			code: "deadlineAt",
			name: "Срок",
			type: "datetime",
			value: task?.deadlineAt?.toISOString() ?? null,
		}),
	];
}
