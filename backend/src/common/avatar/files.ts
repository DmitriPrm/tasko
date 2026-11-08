import { copyFileSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

import { buildAvatarSvg } from "./portrait";

export const AVATAR_DIR = path.join(process.cwd(), "storage", "avatars");

const UPLOAD_EXT: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
};

const KNOWN_EXT = ["svg", "png", "jpg", "webp"];

function ensureDir() {
	mkdirSync(AVATAR_DIR, { recursive: true });
}

function removeUserFiles(userId: string) {
	for (const ext of KNOWN_EXT) {
		const file = path.join(AVATAR_DIR, `${userId}.${ext}`);
		if (existsSync(file)) unlinkSync(file);
	}
}

export function installAvatarFile(userId: string, sourcePath: string) {
	ensureDir();
	removeUserFiles(userId);
	const ext =
		path.extname(sourcePath).replace(".", "").toLowerCase() === "jpeg"
			? "jpg"
			: path.extname(sourcePath).replace(".", "").toLowerCase();
	const file = `${userId}.${ext}`;
	copyFileSync(sourcePath, path.join(AVATAR_DIR, file));
	return file;
}

export function saveGeneratedAvatar(userId: string) {
	ensureDir();
	removeUserFiles(userId);
	const file = `${userId}.svg`;
	writeFileSync(path.join(AVATAR_DIR, file), buildAvatarSvg(userId), "utf8");
	return file;
}

export function saveUploadedAvatar(userId: string, buffer: Buffer, mime: string) {
	const ext = UPLOAD_EXT[mime];
	if (!ext) return null;
	ensureDir();
	removeUserFiles(userId);
	const file = `${userId}.${ext}`;
	writeFileSync(path.join(AVATAR_DIR, file), buffer);
	return file;
}

export function resolveAvatarPath(file: string) {
	if (!/^[0-9a-f-]{36}\.(svg|png|jpg|webp)$/i.test(file)) return null;
	const root = path.resolve(AVATAR_DIR);
	const full = path.resolve(root, file);
	if (!full.startsWith(root + path.sep) || !existsSync(full)) return null;
	return full;
}

export function publicAvatarUrl(file: string | null | undefined, updatedAt?: Date) {
	if (!file) return null;
	const version = updatedAt ? updatedAt.getTime() : 0;
	return `/api/avatars/${file}?v=${version}`;
}
