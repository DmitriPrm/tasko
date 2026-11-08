import { randomUUID } from "crypto";
import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

/** Локальное хранилище; позже можно заменить на S3/MinIO, не меняя таблицу attachments */
export const ATTACHMENT_DIR = path.join(process.cwd(), "storage", "attachments");

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Разрешённые типы файлов и расширение, под которым файл ляжет на диск */
export const ALLOWED_MIME: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/gif": "gif",
	"image/webp": "webp",
	"application/pdf": "pdf",
	"text/plain": "txt",
	"text/csv": "csv",
	"application/zip": "zip",
	"application/x-zip-compressed": "zip",
	"application/msword": "doc",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
	"application/vnd.ms-excel": "xls",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
	"application/vnd.ms-powerpoint": "ppt",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

/**
 * Имя файла для показа: без путей и служебных символов, не длиннее 200 знаков.
 * Multer отдаёт имя в latin1, поэтому сначала возвращаем UTF-8 (иначе кириллица ломается).
 */
export function normalizeFileName(raw: string) {
	const decoded = Buffer.from(raw, "latin1").toString("utf8");
	const base = decoded.includes("�") ? raw : decoded;
	const cleaned = path
		.basename(base.replace(/\\/g, "/"))
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_")
		.trim();
	return (cleaned || "file").slice(0, 200);
}

export function saveAttachmentFile(taskId: string, buffer: Buffer, ext: string) {
	const dir = path.join(ATTACHMENT_DIR, taskId);
	mkdirSync(dir, { recursive: true });
	const storageKey = `${taskId}/${randomUUID()}.${ext}`;
	writeFileSync(path.join(ATTACHMENT_DIR, storageKey), buffer);
	return storageKey;
}

/** Полный путь к файлу; null, если ключ подозрительный или файла нет */
export function resolveAttachmentPath(storageKey: string) {
	if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(storageKey)) return null;
	const root = path.resolve(ATTACHMENT_DIR);
	const full = path.resolve(root, storageKey);
	if (!full.startsWith(root + path.sep) || !existsSync(full)) return null;
	return full;
}

export function removeAttachmentFile(storageKey: string) {
	const full = resolveAttachmentPath(storageKey);
	if (full) unlinkSync(full);
}

/** Стереть все файлы задачи: вызывается при её удалении, строки в базе уходят каскадом */
export function removeTaskAttachmentDir(taskId: string) {
	if (!/^[0-9a-f-]{36}$/i.test(taskId)) return;
	rmSync(path.join(ATTACHMENT_DIR, taskId), { recursive: true, force: true });
}
