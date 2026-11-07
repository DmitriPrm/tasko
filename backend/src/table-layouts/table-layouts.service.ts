import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { assertColumnWidths, assertTableCode, readColumnWidths } from "./table-layout.validation";

@Injectable()
export class TableLayoutsService {
	constructor(private readonly prisma: PrismaService) {}

	async get(user: AuthUser, code: string) {
		const safeCode = assertTableCode(code);
		const layout = await this.prisma.userTableLayout.findUnique({
			where: { userId_code: { userId: user.id, code: safeCode } },
			select: { widths: true },
		});

		return {
			code: safeCode,
			widths: readColumnWidths(layout?.widths),
		};
	}

	async save(user: AuthUser, code: string, rawWidths: unknown) {
		const safeCode = assertTableCode(code);
		const widths = assertColumnWidths(rawWidths);

		await this.prisma.userTableLayout.upsert({
			where: { userId_code: { userId: user.id, code: safeCode } },
			create: {
				userId: user.id,
				code: safeCode,
				widths: widths as Prisma.InputJsonValue,
			},
			update: {
				widths: widths as Prisma.InputJsonValue,
			},
		});

		return { code: safeCode, widths };
	}
}
