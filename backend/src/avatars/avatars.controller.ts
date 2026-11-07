import { createReadStream } from "fs";
import path from "path";

import { Controller, Get, NotFoundException, Param, StreamableFile } from "@nestjs/common";

import { resolveAvatarPath } from "../common/avatar/files";
import { Public } from "../common/decorators/public.decorator";

const MIME: Record<string, string> = {
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".webp": "image/webp",
};

@Controller("avatars")
export class AvatarsController {
	@Public()
	@Get(":file")
	send(@Param("file") file: string) {
		const full = resolveAvatarPath(file);
		if (!full) throw new NotFoundException("Аватар не найден");
		const type = MIME[path.extname(full).toLowerCase()] || "application/octet-stream";
		return new StreamableFile(createReadStream(full), { type, disposition: "inline" });
	}
}
