import { z } from "zod";

import { createDelete, createGet, createPost } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { ZInvitation, ZInvitationCreated, ZInvitationPreview, ZSuccess } from "@/shared/api/v0/schemas";

const ZAccepted = z.object({ success: z.boolean(), projectId: z.string() });

/** Приглашения проекта (для менеджера) */
export const getProjectInvitations = createGet({
	path: "/projects/:id/invitations",
	type: ZWrapDTO(z.array(ZInvitation)),
});

export const createProjectInvitation = createPost({
	path: "/projects/:id/invitations",
	type: ZWrapDTO(ZInvitationCreated),
});

export const resendProjectInvitation = createPost({
	path: "/projects/:id/invitations/:invitationId/resend",
	type: ZWrapDTO(ZInvitationCreated),
});

export const revokeProjectInvitation = createDelete({
	path: "/projects/:id/invitations/:invitationId",
	type: ZWrapDTO(ZSuccess),
});

/** Мои приглашения */
export const getMyInvitations = createGet({
	path: "/invitations/mine",
	type: ZWrapDTO(z.array(ZInvitation)),
});

export const acceptInvitation = createPost({
	path: "/invitations/:invitationId/accept",
	type: ZWrapDTO(ZAccepted),
});

export const declineInvitation = createPost({
	path: "/invitations/:invitationId/decline",
	type: ZWrapDTO(ZSuccess),
});

/** Приглашение по ссылке из письма */
export const getInvitationByToken = createGet({
	path: "/invitations/by-token/:token",
	type: ZWrapDTO(ZInvitationPreview),
});

export const acceptInvitationByToken = createPost({
	path: "/invitations/by-token/:token/accept",
	type: ZWrapDTO(ZAccepted),
});

export const declineInvitationByToken = createPost({
	path: "/invitations/by-token/:token/decline",
	type: ZWrapDTO(ZSuccess),
});
