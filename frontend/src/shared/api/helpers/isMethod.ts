export function isMethod(fn: unknown): fn is { method: object } {
	if (typeof fn !== "function" || !("method" in fn)) return false;
	const method = (fn as { method?: unknown }).method;
	return typeof method === "object" && method !== null;
}
