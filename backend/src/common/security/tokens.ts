import { createHash, randomBytes } from "crypto";

/** Одноразовый токен для ссылок: наружу уходит token, в БД хранится только hash. */
export function generateToken() {
	const token = randomBytes(32).toString("hex");
	return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}
