/**
 * Сквозной сценарий из спецификации (раздел 15):
 * вход → проект → задача → статус → прогноз → аналитика.
 *
 * Проект для теста создаётся через API и удаляется после, чтобы не засорять демо-данные.
 */
import { expect, type APIRequestContext, test } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL || "manager@tasko.local";
const PASSWORD = process.env.E2E_PASSWORD || "Password123!";

let projectId = "";
let projectName = "";

async function apiToken(request: APIRequestContext) {
	const response = await request.post("/api/auth/login", { data: { email: EMAIL, password: PASSWORD } });
	expect(response.ok()).toBeTruthy();
	return (await response.json()).data.accessToken as string;
}

test.beforeAll(async ({ request }) => {
	const token = await apiToken(request);
	projectName = `E2E проект ${Date.now()}`;
	const response = await request.post("/api/projects", {
		headers: { Authorization: `Bearer ${token}` },
		data: { name: projectName, status: "ACTIVE" },
	});
	expect(response.ok()).toBeTruthy();
	projectId = (await response.json()).data.id;
});

test.afterAll(async ({ request }) => {
	if (!projectId) return;
	const token = await apiToken(request);
	await request.delete(`/api/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
});

test("вход → проект → задача → статус → прогноз → аналитика", async ({ page }) => {
	const taskTitle = `E2E задача ${Date.now()}`;

	await test.step("вход", async () => {
		await page.goto("/login");
		await page.getByLabel("Email").fill(EMAIL);
		await page.getByLabel("Пароль").fill(PASSWORD);
		await page.getByRole("button", { name: "Войти" }).click();
		await expect(page).not.toHaveURL(/\/login/);
	});

	await test.step("проект", async () => {
		await page.goto(`/projects/${projectId}`);
		await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
	});

	await test.step("задача", async () => {
		const quickAdd = page.getByPlaceholder("Добавить задачу").first();
		await quickAdd.fill(taskTitle);
		await quickAdd.press("Enter");
		await expect(page.locator(".project-board-card", { hasText: taskTitle })).toBeVisible();
	});

	await test.step("статус", async () => {
		await page.locator(".project-board-card", { hasText: taskTitle }).click();
		const status = page.locator(".task-drawer__status");
		await expect(status).toHaveText("К выполнению");
		await status.click();
		await page.locator(".task-drawer__statuses").getByText("В работе", { exact: true }).click();
		await expect(status).toHaveText("В работе");
	});

	await test.step("прогноз", async () => {
		const forecast = page.locator(".task-forecast");
		await expect(forecast).toBeVisible();
		await expect(forecast).toContainText("Риск срыва срока");
		await expect(forecast).toContainText("Прогноз времени");
		await page.keyboard.press("Escape");
	});

	await test.step("аналитика", async () => {
		await page.getByRole("tab", { name: "Аналитика" }).click();
		await expect(page.getByText("По статусам")).toBeVisible();
		await expect(page.getByLabel(/В работе: 1/)).toBeVisible();
		await expect(page.getByText("Риски срыва сроков")).toBeVisible();
	});
});
