/** Выбор пользователя: светлая, тёмная или как в операционной системе */
export type AppTheme = "light" | "dark" | "system";

const STORAGE_KEY = "tasko-theme";

export function readTheme(): AppTheme {
	if (typeof localStorage === "undefined") return "light";
	const saved = localStorage.getItem(STORAGE_KEY);
	return saved === "dark" || saved === "system" ? saved : "light";
}

const systemQuery = () =>
	typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

/** Какая тема на самом деле применяется сейчас */
export function resolveTheme(theme: AppTheme): "light" | "dark" {
	if (theme !== "system") return theme;
	return systemQuery()?.matches ? "dark" : "light";
}

export function applyTheme(theme: AppTheme) {
	if (typeof document === "undefined") return;
	const resolved = resolveTheme(theme);
	const root = document.documentElement;
	root.dataset.theme = resolved;
	root.classList.toggle("dark", resolved === "dark");
	root.style.colorScheme = resolved;
}

export function setTheme(theme: AppTheme) {
	localStorage.setItem(STORAGE_KEY, theme);
	applyTheme(theme);
}

applyTheme(readTheme());

// «Как в системе»: следим, если пользователь переключит тему в ОС
systemQuery()?.addEventListener?.("change", () => {
	if (readTheme() === "system") applyTheme("system");
});
