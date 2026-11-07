export type AppTheme = "light" | "dark";

const STORAGE_KEY = "tasko-theme";

export function readTheme(): AppTheme {
	if (typeof localStorage === "undefined") return "light";
	return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function applyTheme(theme: AppTheme) {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	root.dataset.theme = theme;
	root.classList.toggle("dark", theme === "dark");
	root.style.colorScheme = theme;
}

export function setTheme(theme: AppTheme) {
	localStorage.setItem(STORAGE_KEY, theme);
	applyTheme(theme);
}

applyTheme(readTheme());
