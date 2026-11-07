import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ProfileCustomField, ProfileFieldType, ProfileSection } from "@prisma/client";

import { AccessService } from "../access/access.service";
import { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProfileFieldDto, UpdateProfileFieldDto } from "./dto/profile-section.dto";

type SectionWithFields = ProfileSection & { fields: ProfileCustomField[] };

export function toSectionDto(section: SectionWithFields) {
	return {
		id: section.id,
		title: section.title,
		position: section.position,
		fields: section.fields.map((field) => ({
			id: field.id,
			name: field.name,
			type: field.type,
			options: field.options,
			value: field.value,
			position: field.position,
		})),
	};
}

const MAX_SECTIONS = 30;
const MAX_FIELDS_PER_SECTION = 50;

/** Разделы и поля профиля, которые пользователь создаёт сам */
@Injectable()
export class ProfileSectionsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly access: AccessService,
	) {}

	async createSection(actor: AuthUser, userId: string, title: string) {
		await this.assertCanEdit(actor, userId);
		const count = await this.prisma.profileSection.count({ where: { userId } });
		if (count >= MAX_SECTIONS) throw new BadRequestException("Слишком много разделов");

		const last = await this.prisma.profileSection.findFirst({
			where: { userId },
			orderBy: { position: "desc" },
		});
		const section = await this.prisma.profileSection.create({
			data: { userId, title: title.trim(), position: (last?.position ?? -1) + 1 },
			include: { fields: true },
		});
		return toSectionDto(section);
	}

	async renameSection(actor: AuthUser, userId: string, sectionId: string, title: string) {
		await this.assertCanEdit(actor, userId);
		await this.getSection(userId, sectionId);
		const section = await this.prisma.profileSection.update({
			where: { id: sectionId },
			data: { title: title.trim() },
			include: { fields: { orderBy: { position: "asc" } } },
		});
		return toSectionDto(section);
	}

	async removeSection(actor: AuthUser, userId: string, sectionId: string) {
		await this.assertCanEdit(actor, userId);
		await this.getSection(userId, sectionId);
		await this.prisma.profileSection.delete({ where: { id: sectionId } });
		return { success: true };
	}

	async createField(actor: AuthUser, userId: string, sectionId: string, dto: CreateProfileFieldDto) {
		await this.assertCanEdit(actor, userId);
		await this.getSection(userId, sectionId);

		const type = dto.type ?? ProfileFieldType.TEXT;
		const options = this.normalizeOptions(type, dto.options);
		const count = await this.prisma.profileCustomField.count({ where: { sectionId } });
		if (count >= MAX_FIELDS_PER_SECTION) throw new BadRequestException("В разделе слишком много полей");

		const last = await this.prisma.profileCustomField.findFirst({
			where: { sectionId },
			orderBy: { position: "desc" },
		});
		const field = await this.prisma.profileCustomField.create({
			data: {
				sectionId,
				name: dto.name.trim(),
				type,
				options,
				value: dto.value ?? "",
				position: (last?.position ?? -1) + 1,
			},
		});
		return toSectionDto({ ...(await this.getSection(userId, sectionId)), fields: [field] }).fields[0];
	}

	async updateField(actor: AuthUser, userId: string, fieldId: string, dto: UpdateProfileFieldDto) {
		await this.assertCanEdit(actor, userId);
		const current = await this.getField(userId, fieldId);

		const type = dto.type ?? current.type;
		const options = this.normalizeOptions(type, dto.options ?? current.options);
		const field = await this.prisma.profileCustomField.update({
			where: { id: fieldId },
			data: {
				name: dto.name?.trim(),
				type,
				options,
				// при смене типа старое значение может не подойти - сбрасываем его
				value: dto.value ?? (dto.type && dto.type !== current.type ? "" : undefined),
			},
		});
		return toSectionDto({ ...(await this.getSection(userId, field.sectionId)), fields: [field] }).fields[0];
	}

	async removeField(actor: AuthUser, userId: string, fieldId: string) {
		await this.assertCanEdit(actor, userId);
		await this.getField(userId, fieldId);
		await this.prisma.profileCustomField.delete({ where: { id: fieldId } });
		return { success: true };
	}

	private normalizeOptions(type: ProfileFieldType, options?: string[]) {
		if (type !== ProfileFieldType.SELECT && type !== ProfileFieldType.MULTI_SELECT) return [];
		const unique = [...new Set((options ?? []).map((option) => option.trim()).filter(Boolean))];
		if (!unique.length) throw new BadRequestException("Добавьте хотя бы один вариант ответа");
		return unique;
	}

	private async assertCanEdit(actor: AuthUser, userId: string) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) throw new NotFoundException("Пользователь не найден");

		const allowed =
			actor.id === userId
				? await this.access.has(actor, "PROFILE_EDIT_OWN")
				: await this.access.has(actor, "PROFILE_EDIT_OTHERS");
		if (!allowed) throw new ForbiddenException("Недостаточно прав для изменения профиля");
	}

	private async getSection(userId: string, sectionId: string) {
		const section = await this.prisma.profileSection.findFirst({
			where: { id: sectionId, userId },
			include: { fields: true },
		});
		if (!section) throw new NotFoundException("Раздел не найден");
		return section;
	}

	private async getField(userId: string, fieldId: string) {
		const field = await this.prisma.profileCustomField.findFirst({
			where: { id: fieldId, section: { userId } },
		});
		if (!field) throw new NotFoundException("Поле не найдено");
		return field;
	}
}
