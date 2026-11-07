import { SystemRole, User } from "@prisma/client";

import { makeField, option } from "../common/form/form-field";

export function getUserFields(user?: User) {
	return [
		makeField({
			code: "fullName",
			name: "Имя",
			type: "text",
			value: user?.fullName ?? "",
			require: true,
		}),
		makeField({
			code: "email",
			name: "Email",
			type: "text",
			value: user?.email ?? "",
			require: !user,
			disabled: Boolean(user),
		}),
		makeField({
			code: "password",
			name: user ? "Новый пароль" : "Пароль",
			type: "password",
			value: "",
			require: !user,
		}),
		makeField({
			code: "systemRole",
			name: "Роль",
			type: "select",
			value: user?.systemRole ?? SystemRole.EXECUTOR,
			require: true,
			possibleValues: [
				option(SystemRole.ADMIN, "Администратор"),
				option(SystemRole.MANAGER, "Руководитель"),
				option(SystemRole.EXECUTOR, "Исполнитель"),
			],
		}),
	];
}
