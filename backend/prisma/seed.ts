import {
	PrismaClient,
	ProfileFieldType,
	ProjectRole,
	ProjectStatus,
	SystemRole,
	TaskPriority,
	TaskStatus,
	TaskType,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

import { existsSync } from "fs";
import path from "path";

import { PERMISSIONS, ROLE_DEFAULTS } from "../src/access/permissions";
import { AVATAR_DIR, installAvatarFile, saveGeneratedAvatar } from "../src/common/avatar/files";

const prisma = new PrismaClient();

async function main() {
	const passwordHash = await bcrypt.hash("Password123!", 10);

	const admin = await prisma.user.upsert({
		where: { email: "admin@tasko.local" },
		update: {},
		create: {
			email: "admin@tasko.local",
			fullName: "Администратор",
			passwordHash,
			systemRole: SystemRole.ADMIN,
		},
	});

	const manager = await prisma.user.upsert({
		where: { email: "manager@tasko.local" },
		update: {},
		create: {
			email: "manager@tasko.local",
			fullName: "Ирина Петрова",
			passwordHash,
			systemRole: SystemRole.MANAGER,
		},
	});

	const executor = await prisma.user.upsert({
		where: { email: "executor@tasko.local" },
		update: {},
		create: {
			email: "executor@tasko.local",
			fullName: "Алексей Смирнов",
			passwordHash,
			systemRole: SystemRole.EXECUTOR,
		},
	});

	const project = await prisma.project.upsert({
		where: { id: "11111111-1111-1111-1111-111111111111" },
		update: {},
		create: {
			id: "11111111-1111-1111-1111-111111111111",
			name: "Запуск TASKO MVP",
			description: "Первый рабочий контур управления проектами без ML.",
			status: ProjectStatus.ACTIVE,
			ownerId: manager.id,
			plannedStartAt: new Date(),
			plannedEndAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			members: {
				create: [
					{ userId: manager.id, projectRole: ProjectRole.MANAGER },
					{ userId: executor.id, projectRole: ProjectRole.MEMBER },
					{ userId: admin.id, projectRole: ProjectRole.MEMBER },
				],
			},
		},
	});

	const tagSeeds = [
		{ name: "Фронтенд", color: "#2563EB" },
		{ name: "Бэкенд", color: "#0891B2" },
		{ name: "Проектирование", color: "#DC2626" },
		{ name: "Разработка", color: "#059669" },
	];

	for (const tag of tagSeeds) {
		await prisma.tag.upsert({
			where: { projectId_name: { projectId: project.id, name: tag.name } },
			update: { color: tag.color },
			create: { projectId: project.id, name: tag.name, color: tag.color },
		});
	}

	const existingTasks = await prisma.task.count({ where: { projectId: project.id } });
	if (existingTasks === 0) {
		await prisma.task.createMany({
			data: [
				{
					projectId: project.id,
					authorId: manager.id,
					assigneeId: executor.id,
					title: "Собрать требования к доске задач",
					description: "Описать статусы, фильтры и карточку задачи.",
					type: TaskType.TASK,
					priority: TaskPriority.HIGH,
					status: TaskStatus.IN_PROGRESS,
					actualStartAt: new Date(),
					deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
				},
				{
					projectId: project.id,
					authorId: manager.id,
					assigneeId: executor.id,
					title: "Проверить вход и роли",
					description: "Убедиться, что исполнитель видит только свои проекты.",
					type: TaskType.FEATURE,
					priority: TaskPriority.MEDIUM,
					status: TaskStatus.TODO,
					deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
				},
				{
					projectId: project.id,
					authorId: manager.id,
					assigneeId: manager.id,
					title: "Подготовить сводку по проекту",
					type: TaskType.RESEARCH,
					priority: TaskPriority.LOW,
					status: TaskStatus.REVIEW,
					deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
				},
			],
		});
	}

	const tags = await prisma.tag.findMany({ where: { projectId: project.id } });
	const tasks = await prisma.task.findMany({ where: { projectId: project.id } });
	for (const [index, task] of tasks.entries()) {
		const tag = tags[index % tags.length];
		if (!tag) continue;
		await prisma.taskTag.upsert({
			where: { taskId_tagId: { taskId: task.id, tagId: tag.id } },
			update: {},
			create: { taskId: task.id, tagId: tag.id },
		});
	}

	await seedAccess();
	await seedProfile(passwordHash);
	await seedAvatars();

	// Демо-пользователи считаются подтверждёнными
	await prisma.user.updateMany({ where: { emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });

	console.log("Seed completed");
	console.log("Admin: admin@tasko.local / Password123!");
	console.log("Manager: manager@tasko.local / Password123!");
	console.log("Executor: executor@tasko.local / Password123!");
	console.log("Остальные демо-пользователи: имя@tasko.local / Password123!");
}

const DEMO_PORTRAITS: Record<string, string> = {
	"admin@tasko.local": "admin.jpg",
	"manager@tasko.local": "irina.jpg",
	"executor@tasko.local": "alexey.jpg",
	"maria@tasko.local": "maria.jpg",
	"dmitry@tasko.local": "dmitry.jpg",
	"olga@tasko.local": "olga.jpg",
	"pavel@tasko.local": "pavel.jpg",
	"anna@tasko.local": "anna.jpg",
	"nikita@tasko.local": "nikita.jpg",
	"elena@tasko.local": "elena.jpg",
};

async function seedAvatars() {
	const demoDir = path.resolve(__dirname, "../assets/demo-avatars");
	const users = await prisma.user.findMany();
	for (const person of users) {
		const portraitName = DEMO_PORTRAITS[person.email];
		const portrait = portraitName ? path.join(demoDir, portraitName) : "";
		if (portrait && existsSync(portrait)) {
			const expected = `${person.id}.jpg`;
			if (person.avatarFile === expected && existsSync(path.join(AVATAR_DIR, expected))) continue;
			const avatarFile = installAvatarFile(person.id, portrait);
			await prisma.user.update({ where: { id: person.id }, data: { avatarFile } });
			continue;
		}
		const current = person.avatarFile ? path.join(AVATAR_DIR, person.avatarFile) : "";
		if (current && existsSync(current)) continue;
		const avatarFile = saveGeneratedAvatar(person.id);
		await prisma.user.update({ where: { id: person.id }, data: { avatarFile } });
	}
}

async function seedAccess() {
	for (const role of Object.values(SystemRole)) {
		for (const permission of PERMISSIONS) {
			const enabled = ROLE_DEFAULTS[role].includes(permission.code);
			await prisma.rolePermission.upsert({
				where: { role_code: { role, code: permission.code } },
				update: {},
				create: { role, code: permission.code, enabled },
			});
		}
	}
}

async function seedProfile(passwordHash: string) {
	const people = [
		{ email: "maria@tasko.local", fullName: "Мария Соколова", systemRole: SystemRole.MANAGER },
		{ email: "dmitry@tasko.local", fullName: "Дмитрий Волков", systemRole: SystemRole.EXECUTOR },
		{ email: "olga@tasko.local", fullName: "Ольга Кузнецова", systemRole: SystemRole.EXECUTOR },
		{ email: "pavel@tasko.local", fullName: "Павел Орлов", systemRole: SystemRole.EXECUTOR },
		{ email: "anna@tasko.local", fullName: "Анна Лебедева", systemRole: SystemRole.EXECUTOR },
		{ email: "nikita@tasko.local", fullName: "Никита Егоров", systemRole: SystemRole.MANAGER },
		{ email: "elena@tasko.local", fullName: "Елена Морозова", systemRole: SystemRole.EXECUTOR },
	];

	for (const person of people) {
		await prisma.user.upsert({
			where: { email: person.email },
			update: { fullName: person.fullName, systemRole: person.systemRole },
			create: { ...person, passwordHash },
		});
	}

	const users = await prisma.user.findMany();
	const samples: Record<
		string,
		{ section: string; fields: { name: string; type: ProfileFieldType; options?: string[]; value: string }[] }[]
	> = {
		"admin@tasko.local": [
			{
				section: "О себе",
				fields: [
					{ name: "О себе", type: ProfileFieldType.TEXTAREA, value: "Следит за доступами и составом команд." },
					{ name: "Должность", type: ProfileFieldType.TEXT, value: "Администратор платформы" },
				],
			},
			{
				section: "Контакты",
				fields: [
					{ name: "Телефон", type: ProfileFieldType.TEXT, value: "+7 900 000-00-01" },
					{ name: "Город", type: ProfileFieldType.TEXT, value: "Москва" },
				],
			},
		],
	};
	const fallback = (fullName: string, role: SystemRole) => [
		{
			section: "О себе",
			fields: [
				{ name: "О себе", type: ProfileFieldType.TEXTAREA, value: `${fullName} работает в команде TASKO.` },
				{
					name: "Должность",
					type: ProfileFieldType.TEXT,
					value: role === SystemRole.MANAGER ? "Руководитель проектов" : "Инженер",
				},
			],
		},
		{
			section: "Работа",
			fields: [
				{
					name: "Навыки",
					type: ProfileFieldType.MULTI_SELECT,
					options: ["Vue", "NestJS", "PostgreSQL", "Дизайн", "Аналитика"],
					value: JSON.stringify(["Vue"]),
				},
			],
		},
	];

	for (const user of users) {
		// Разделы создаёт сам пользователь; для демо заполняем их только если их ещё нет
		const existing = await prisma.profileSection.count({ where: { userId: user.id } });
		if (existing > 0) continue;
		const sections = samples[user.email] ?? fallback(user.fullName, user.systemRole);
		for (const [sectionIndex, section] of sections.entries()) {
			await prisma.profileSection.create({
				data: {
					userId: user.id,
					title: section.section,
					position: sectionIndex,
					fields: {
						create: section.fields.map((field, fieldIndex) => ({
							name: field.name,
							type: field.type,
							options: field.options ?? [],
							value: field.value,
							position: fieldIndex,
						})),
					},
				},
			});
		}
	}

	const byEmail = Object.fromEntries(users.map((user) => [user.email, user]));
	const projects = [
		{
			id: "22222222-2222-2222-2222-222222222222",
			name: "Мобильное приложение",
			description: "Карманный доступ к задачам и уведомлениям.",
			status: ProjectStatus.ACTIVE,
			ownerEmail: "maria@tasko.local",
			members: ["maria@tasko.local", "dmitry@tasko.local", "anna@tasko.local", "admin@tasko.local"],
		},
		{
			id: "33333333-3333-3333-3333-333333333333",
			name: "Внедрение у заказчика",
			description: "Пилот на трёх командах заказчика.",
			status: ProjectStatus.PLANNED,
			ownerEmail: "nikita@tasko.local",
			members: ["nikita@tasko.local", "olga@tasko.local", "pavel@tasko.local", "elena@tasko.local"],
		},
		{
			id: "44444444-4444-4444-4444-444444444444",
			name: "Исследование интерфейса",
			description: "Сравнение сценариев доски, списков и профиля.",
			status: ProjectStatus.ACTIVE,
			ownerEmail: "manager@tasko.local",
			members: ["manager@tasko.local", "executor@tasko.local", "anna@tasko.local", "olga@tasko.local"],
		},
	];

	for (const item of projects) {
		const owner = byEmail[item.ownerEmail];
		if (!owner) continue;
		const project = await prisma.project.upsert({
			where: { id: item.id },
			update: { name: item.name, description: item.description, status: item.status },
			create: {
				id: item.id,
				name: item.name,
				description: item.description,
				status: item.status,
				ownerId: owner.id,
				plannedStartAt: new Date(),
				plannedEndAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
			},
		});
		for (const email of item.members) {
			const member = byEmail[email];
			if (!member) continue;
			await prisma.projectMember.upsert({
				where: { projectId_userId: { projectId: project.id, userId: member.id } },
				update: {},
				create: {
					projectId: project.id,
					userId: member.id,
					projectRole: email === item.ownerEmail ? ProjectRole.MANAGER : ProjectRole.MEMBER,
				},
			});
		}
		const count = await prisma.task.count({ where: { projectId: project.id } });
		if (count > 0) continue;
		const assignees = item.members.map((email) => byEmail[email]).filter(Boolean);
		const titles = [
			"Уточнить сценарий",
			"Собрать макет карточки",
			"Проверить права доступа",
			"Подготовить демо-данные",
			"Согласовать срок",
		];
		await prisma.task.createMany({
			data: titles.map((title, index) => ({
				projectId: project.id,
				authorId: owner.id,
				assigneeId: assignees[index % assignees.length]?.id,
				title: `${title}: ${item.name}`,
				description: "Демонстрационная задача для обзора доски и списков.",
				type: [TaskType.TASK, TaskType.FEATURE, TaskType.BUG, TaskType.RESEARCH][index % 4],
				priority: [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.CRITICAL][index % 4],
				status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE, TaskStatus.CANCELLED][
					index % 5
				],
				deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * (index - 1)),
				isCompleted: index % 5 === 3,
			})),
		});
	}
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
