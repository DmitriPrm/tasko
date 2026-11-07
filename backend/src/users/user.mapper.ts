import { User } from "@prisma/client";

import { getAvatarColor, getInitials } from "../common/avatar/avatar";
import { publicAvatarUrl } from "../common/avatar/files";

export function toUserDto(user: User) {
	return {
		id: user.id,
		email: user.email,
		fullName: user.fullName,
		systemRole: user.systemRole,
		isActive: user.isActive,
		emailVerified: Boolean(user.emailVerifiedAt),
		initials: getInitials(user.fullName),
		avatarColor: getAvatarColor(user.id),
		avatarUrl: publicAvatarUrl(user.avatarFile, user.updatedAt),
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	};
}
