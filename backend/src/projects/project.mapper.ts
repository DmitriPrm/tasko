import { Project, ProjectMember, Tag, User } from "@prisma/client";

import { toUserDto } from "../users/user.mapper";

type ProjectWithRelations = Project & {
	owner: User;
	members?: (ProjectMember & { user: User })[];
	tags?: Tag[];
	_count?: { tasks: number; members: number };
};

export function toTagDto(tag: Tag) {
	return {
		id: tag.id,
		projectId: tag.projectId,
		name: tag.name,
		color: tag.color,
		createdAt: tag.createdAt.toISOString(),
	};
}

export function toProjectDto(project: ProjectWithRelations, isFavorite = false) {
	return {
		id: project.id,
		name: project.name,
		description: project.description,
		status: project.status,
		ownerId: project.ownerId,
		owner: toUserDto(project.owner),
		plannedStartAt: project.plannedStartAt?.toISOString() ?? null,
		plannedEndAt: project.plannedEndAt?.toISOString() ?? null,
		createdAt: project.createdAt.toISOString(),
		updatedAt: project.updatedAt.toISOString(),
		membersCount: project._count?.members ?? project.members?.length ?? 0,
		tasksCount: project._count?.tasks ?? 0,
		isFavorite,
		tags: project.tags?.map(toTagDto),
		members: project.members?.map((member) => ({
			id: member.id,
			projectId: member.projectId,
			userId: member.userId,
			projectRole: member.projectRole,
			joinedAt: member.joinedAt.toISOString(),
			user: toUserDto(member.user),
		})),
	};
}
