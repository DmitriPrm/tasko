import { defineConfig } from "@playwright/test";

/**
 * Сквозной сценарий в браузере. По умолчанию — против системы в Docker (http://localhost:8080);
 * другой адрес: E2E_BASE_URL=http://localhost:5174 npm run test:e2e.
 * Используется установленный Google Chrome, поэтому браузеры Playwright скачивать не нужно.
 */
export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	expect: { timeout: 10_000 },
	fullyParallel: false,
	retries: 0,
	reporter: [["list"]],
	use: {
		baseURL: process.env.E2E_BASE_URL || "http://localhost:8080",
		channel: "chrome",
		headless: true,
		locale: "ru-RU",
		screenshot: "only-on-failure",
		trace: "retain-on-failure",
	},
	outputDir: "./e2e/.results",
});
