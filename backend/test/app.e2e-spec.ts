/**
 * Интеграционные тесты API на настоящей PostgreSQL (отдельная база tasko_test).
 * Проверяют критерии приёмки спецификации: AC-01…AC-06, AC-10, AC-11.
 *
 * Запуск: npm run test:e2e  (нужен запущенный docker compose up -d postgres)
 * База берётся из TEST_DATABASE_URL; перед тестами к ней применяются миграции, таблицы очищаются.
 */
import { execSync } from "node:child_process";
import path from "node:path";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient, SystemRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";

const TEST_DB = process.env.TEST_DATABASE_URL || "postgresql://tasko:tasko@localhost:5434/tasko_test?schema=public";
// Переменные задаём до загрузки модулей: ConfigModule не перезаписывает уже заданные значения
process.env.DATABASE_URL = TEST_DB;
// Закрытый порт: ML-сервис «упал» — система обязана работать без него (AC-11)
process.env.ML_SERVICE_URL = "http://127.0.0.1:9";
process.env.ML_TIMEOUT_MS = "1000";
process.env.SMTP_HOST = "";

const PASSWORD = "Password123!";

describe("TASKO API (e2e)", () => {
	let app: INestApplication;
	let prisma: PrismaClient;
	const ids: Record<string, string> = {};
	const tokens: Record<string, string> = {};
	const createdTaskIds: string[] = [];

	const api = () => request(app.getHttpServer());
	const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

	beforeAll(async () => {
		execSync("npx prisma migrate deploy", {
			cwd: path.resolve(__dirname, ".."),
			env: { ...process.env, DATABASE_URL: TEST_DB },
			stdio: "ignore",
		});

		prisma = new PrismaClient({ datasourceUrl: TEST_DB });
		const tables = await prisma.$queryRaw<{ tablename: string }[]>`
			SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
		await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);

		const passwordHash = await bcrypt.hash(PASSWORD, 4);
		const people: [string, SystemRole][] = [
			["admin", SystemRole.ADMIN],
			["manager", SystemRole.MANAGER],
			["executor", SystemRole.EXECUTOR],
			["outsider", SystemRole.EXECUTOR],
		];
		for (const [key, systemRole] of people) {
			const user = await prisma.user.create({
				data: {
					email: `${key}@e2e.local`,
					fullName: key,
					passwordHash,
					systemRole,
					emailVerifiedAt: new Date(),
				},
			});
			ids[key] = user.id;
		}

		// Модули импортируем после настройки окружения
		const { AppModule } = await import("../src/app.module");
		const { configureApp } = await import("../src/app.setup");
		const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
		app = configureApp(moduleRef.createNestApplication());
		await app.init();

		for (const key of Object.keys(ids)) {
			const response = await api()
				.post("/api/auth/login")
				.send({ email: `${key}@e2e.local`, password: PASSWORD });
			tokens[key] = response.body.data.accessToken;
		}
	});

	afterAll(async () => {
		const { removeTaskAttachmentDir } = await import("../src/attachments/attachment-storage");
		createdTaskIds.forEach(removeTaskAttachmentDir);
		await app?.close();
		await prisma?.$disconnect();
	});

	describe("AC-01: аутентификация и доступ к данным", () => {
		it("не пускает без токена и с неверным паролем", async () => {
			await api().get("/api/projects").expect(401);
			await api().post("/api/auth/login").send({ email: "manager@e2e.local", password: "WrongPassword1!" }).expect(401);
		});

		it("возвращает текущего пользователя", async () => {
			const response = await api().get("/api/auth/me").set(as("manager")).expect(200);
			expect(response.body.data).toMatchObject({ email: "manager@e2e.local", systemRole: "MANAGER" });
		});

		it("не показывает ошибку сервера целиком (без stack trace)", async () => {
			const response = await api().post("/api/projects").set(as("manager")).send({ name: 42 }).expect(400);
			expect(JSON.stringify(response.body)).not.toMatch(/stack|at .*\.ts/);
		});
	});

	describe("AC-02: руководитель создаёт проект, участника и задачу", () => {
		it("создаёт проект", async () => {
			const response = await api()
				.post("/api/projects")
				.set(as("manager"))
				.send({ name: "E2E проект", status: "ACTIVE" })
				.expect(201);
			ids.project = response.body.data.id;
		});

		it("добавляет участника", async () => {
			await api()
				.post(`/api/projects/${ids.project}/members`)
				.set(as("manager"))
				.send({ userId: ids.executor, projectRole: "MEMBER" })
				.expect(201);
		});

		it("создаёт задачу на участника, но не на постороннего", async () => {
			await api()
				.post(`/api/projects/${ids.project}/tasks`)
				.set(as("manager"))
				.send({ title: "Чужой исполнитель", assigneeId: ids.outsider })
				.expect(400);

			const response = await api()
				.post(`/api/projects/${ids.project}/tasks`)
				.set(as("manager"))
				.send({ title: "E2E задача", type: "FEATURE", priority: "HIGH", assigneeId: ids.executor })
				.expect(201);
			ids.task = response.body.data.id;
			createdTaskIds.push(ids.task);
			expect(response.body.data).toMatchObject({ status: "TODO", assigneeId: ids.executor });
		});

		it("не показывает проект постороннему пользователю", async () => {
			const status = (await api().get(`/api/projects/${ids.project}`).set(as("outsider"))).status;
			expect([403, 404]).toContain(status);
			const list = await api().get("/api/projects").set(as("outsider")).expect(200);
			expect(list.body.data.items.map((item: { id: string }) => item.id)).not.toContain(ids.project);
		});
	});

	describe("AC-11: сбой ML не блокирует работу", () => {
		it("задача сохранена с прогнозом по правилам, хотя ML-сервис недоступен", async () => {
			const response = await api().get(`/api/tasks/${ids.task}`).set(as("manager")).expect(200);
			expect(response.body.data.forecast).toMatchObject({ source: "RULES" });
			const prediction = await api().post(`/api/tasks/${ids.task}/prediction`).set(as("manager")).expect(201);
			expect(prediction.body.data.refreshed).toBe(false);
		});
	});

	describe("AC-03, AC-04, AC-10: workflow, права исполнителя, итоги задачи", () => {
		it("исполнитель проводит свою задачу по статусам", async () => {
			for (const status of ["IN_PROGRESS", "REVIEW", "DONE"]) {
				await api().post(`/api/tasks/${ids.task}/transitions`).set(as("executor")).send({ status }).expect(201);
			}
		});

		it("переходы сохранены в истории, фиксируются начало и завершение", async () => {
			const history = await api().get(`/api/tasks/${ids.task}/history`).set(as("executor")).expect(200);
			const steps = history.body.data.statusHistory.map((item: { toStatus: string }) => item.toStatus).reverse();
			expect(steps).toEqual(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]);

			const task = await api().get(`/api/tasks/${ids.task}`).set(as("executor")).expect(200);
			expect(task.body.data.actualStartAt).toBeTruthy();
			expect(task.body.data.completedAt).toBeTruthy();
		});

		it("исполнитель не может менять проект и чужие задачи", async () => {
			await api().patch(`/api/projects/${ids.project}`).set(as("executor")).send({ name: "Взлом" }).expect(403);
			await api().patch(`/api/tasks/${ids.task}`).set(as("executor")).send({ title: "Взлом" }).expect(403);
		});

		it("посторонний не может двигать задачу", async () => {
			const status = (
				await api().post(`/api/tasks/${ids.task}/transitions`).set(as("outsider")).send({ status: "TODO" })
			).status;
			expect([403, 404]).toContain(status);
		});
	});

	describe("AC-05: комментарии и вложения связаны с задачей", () => {
		it("добавляет комментарий", async () => {
			await api().post(`/api/tasks/${ids.task}/comments`).set(as("executor")).send({ body: "Готово" }).expect(201);
			const list = await api().get(`/api/tasks/${ids.task}/comments`).set(as("manager")).expect(200);
			expect(list.body.data).toEqual([expect.objectContaining({ body: "Готово", taskId: ids.task })]);
		});

		it("загружает и скачивает вложение, отклоняет запрещённый тип", async () => {
			const upload = await api()
				.post(`/api/tasks/${ids.task}/attachments`)
				.set(as("executor"))
				.attach("file", Buffer.from("отчёт"), { filename: "отчёт.txt", contentType: "text/plain" })
				.expect(201);
			expect(upload.body.data).toMatchObject({ originalName: "отчёт.txt", taskId: ids.task });

			const file = await api()
				.get(`/api/tasks/${ids.task}/attachments/${upload.body.data.id}/download`)
				.set(as("manager"))
				.expect(200);
			expect(file.text).toBe("отчёт");

			await api()
				.post(`/api/tasks/${ids.task}/attachments`)
				.set(as("executor"))
				.attach("file", Buffer.from("MZ"), { filename: "virus.exe", contentType: "application/x-msdownload" })
				.expect(400);
		});
	});

	describe("AC-06: аналитика проекта и загрузки", () => {
		it("считает статусы, сроки и загрузку", async () => {
			const overview = await api()
				.get(`/api/projects/${ids.project}/analytics/overview`)
				.set(as("manager"))
				.expect(200);
			expect(overview.body.data).toMatchObject({ total: 1, completed: 1 });
			expect(overview.body.data.byStatus.DONE).toBe(1);

			const workload = await api()
				.get(`/api/projects/${ids.project}/analytics/workload`)
				.set(as("manager"))
				.expect(200);
			expect(workload.body.data.map((item: { userId: string }) => item.userId)).toContain(ids.executor);

			const risks = await api().get(`/api/projects/${ids.project}/analytics/risks`).set(as("manager")).expect(200);
			expect(risks.body.data.durations.summary.closed).toBe(1);
		});
	});

	describe("Начатую задачу нельзя удалить — только отменить", () => {
		it("отменяет вместо удаления", async () => {
			const response = await api().delete(`/api/tasks/${ids.task}`).set(as("manager")).expect(200);
			expect(response.body.data).toEqual({ success: true, cancelled: true });
		});
	});

	describe("Сессии: смена пароля и выход на всех устройствах", () => {
		it("после смены пароля старый токен не работает, новый — работает", async () => {
			await api()
				.post("/api/auth/change-password")
				.set(as("executor"))
				.send({ currentPassword: "неверный1", newPassword: "NewPassword1" })
				.expect(400);

			const changed = await api()
				.post("/api/auth/change-password")
				.set(as("executor"))
				.send({ currentPassword: PASSWORD, newPassword: "NewPassword1" })
				.expect(201);
			await api().get("/api/auth/me").set(as("executor")).expect(401);

			tokens.executor = changed.body.data.accessToken;
			await api().get("/api/auth/me").set(as("executor")).expect(200);
			await api().post("/api/auth/login").send({ email: "executor@e2e.local", password: "NewPassword1" }).expect(201);
		});

		it("«выйти на всех устройствах» отзывает остальные сессии", async () => {
			const other = await api().post("/api/auth/login").send({ email: "manager@e2e.local", password: PASSWORD });
			const otherToken = other.body.data.accessToken;

			const fresh = await api().post("/api/auth/logout-all").set(as("manager")).expect(201);
			await api()
				.get("/api/auth/me")
				.set({ Authorization: `Bearer ${otherToken}` })
				.expect(401);

			tokens.manager = fresh.body.data.accessToken;
			await api().get("/api/auth/me").set(as("manager")).expect(200);
		});
	});

	describe("Личные настройки уведомлений", () => {
		it("отключённое уведомление не попадает в список, но сохраняется приглушённым", async () => {
			await api()
				.patch("/api/me/preferences")
				.set(as("executor"))
				.send({ notifications: { TASK_ASSIGNED: { inApp: false } } })
				.expect(200);

			const task = await api()
				.post(`/api/projects/${ids.project}/tasks`)
				.set(as("manager"))
				.send({ title: "Тихая задача", assigneeId: ids.executor })
				.expect(201);
			createdTaskIds.push(task.body.data.id);

			const list = await api().get("/api/notifications").set(as("executor")).expect(200);
			const titles = list.body.data.items.map((item: { body: string }) => item.body);
			expect(titles.some((body: string) => body.includes("Тихая задача"))).toBe(false);

			const stored = await prisma.notification.findFirst({
				where: { userId: ids.executor, relatedTaskId: task.body.data.id },
			});
			expect(stored).toMatchObject({ muted: true, isRead: true });
		});
	});

	describe("Данные: выгрузки и журнал действий", () => {
		it("администратор выгружает задачи в CSV и обезличенный набор для ML", async () => {
			const tasks = await api().get("/api/settings/data/tasks.csv").set(as("admin")).expect(200);
			expect(tasks.headers["content-type"]).toContain("text/csv");
			expect(tasks.text).toContain("E2E задача");

			const dataset = await api().get("/api/settings/data/ml-dataset.csv").set(as("admin")).expect(200);
			expect(dataset.text).toContain("duration_hours");
			// Ни названий задач, ни почты в обезличенном наборе
			expect(dataset.text).not.toContain("E2E задача");
			expect(dataset.text).not.toContain("@e2e.local");
		});

		it("журнал показывает, кто и что менял, и закрыт для не-администраторов", async () => {
			const audit = await api().get(`/api/settings/data/audit?projectId=${ids.project}`).set(as("admin")).expect(200);
			expect(audit.body.data.total).toBeGreaterThan(0);
			expect(audit.body.data.items[0]).toMatchObject({ actor: expect.any(Object), task: expect.any(Object) });

			await api().get("/api/settings/data/audit").set(as("manager")).expect(403);
			await api().get("/api/settings/data/tasks.csv").set(as("executor")).expect(403);
		});
	});

	describe("Восстановление пароля", () => {
		it("ответ одинаковый для любого адреса, письмо — только существующему", async () => {
			await api().post("/api/auth/forgot-password").send({ email: "nobody@e2e.local" }).expect(201);
			await api().post("/api/auth/forgot-password").send({ email: "admin@e2e.local" }).expect(201);
			expect(await prisma.passwordResetToken.count({ where: { userId: ids.admin } })).toBe(1);
			expect(await prisma.passwordResetToken.count()).toBe(1);
		});

		it("ссылка одноразовая, после сброса старые сессии завершаются", async () => {
			// Ссылка уходит письмом; в тесте создаём её сами тем же способом, что и сервер
			const { generateToken } = await import("../src/common/security/tokens");
			const { token, hash } = generateToken();
			await prisma.passwordResetToken.create({
				data: { userId: ids.admin, tokenHash: hash, expiresAt: new Date(Date.now() + 60_000) },
			});

			await api().post("/api/auth/reset-password").send({ token, newPassword: "ResetPass1" }).expect(201);
			await api().get("/api/auth/me").set(as("admin")).expect(401);
			await api().post("/api/auth/reset-password").send({ token, newPassword: "ResetPass2" }).expect(400);

			const login = await api()
				.post("/api/auth/login")
				.send({ email: "admin@e2e.local", password: "ResetPass1" })
				.expect(201);
			tokens.admin = login.body.data.accessToken;
		});
	});

	describe("Комментарии: правка и удаление", () => {
		it("автор правит свой комментарий, чужой — нет; руководитель удаляет", async () => {
			const created = await api()
				.post(`/api/tasks/${ids.task}/comments`)
				.set(as("executor"))
				.send({ body: "Опечатка" })
				.expect(201);
			const commentId = created.body.data.id;
			expect(created.body.data).toMatchObject({ canEdit: true, canDelete: true, edited: false });

			const edited = await api()
				.patch(`/api/tasks/${ids.task}/comments/${commentId}`)
				.set(as("executor"))
				.send({ body: "Исправлено" })
				.expect(200);
			expect(edited.body.data.body).toBe("Исправлено");

			await api()
				.patch(`/api/tasks/${ids.task}/comments/${commentId}`)
				.set(as("manager"))
				.send({ body: "Чужая правка" })
				.expect(403);
			await api().delete(`/api/tasks/${ids.task}/comments/${commentId}`).set(as("manager")).expect(200);

			const list = await api().get(`/api/tasks/${ids.task}/comments`).set(as("manager")).expect(200);
			expect(list.body.data.map((item: { id: string }) => item.id)).not.toContain(commentId);
		});
	});

	describe("Заблокированный пользователь теряет доступ", () => {
		it("сразу, даже с действующим токеном", async () => {
			await api().patch(`/api/users/${ids.outsider}`).set(as("admin")).send({ isActive: false }).expect(200);
			await api().get("/api/auth/me").set(as("outsider")).expect(401);
			await api().post("/api/auth/login").send({ email: "outsider@e2e.local", password: PASSWORD }).expect(401);
		});
	});
});
