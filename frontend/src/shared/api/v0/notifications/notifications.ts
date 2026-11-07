import { z } from "zod";

import { createGet, createPatch } from "@/shared/api/helpers/api";
import { ZWrapDTO } from "@/shared/api/helpers/ZWrapDTO";
import { ZNotification, ZSuccess, ZUnreadCount } from "@/shared/api/v0/schemas";

export const getNotifications = createGet({
	path: "/notifications",
	type: ZWrapDTO(z.array(ZNotification)),
});

export const getUnreadCount = createGet({
	path: "/notifications/unread-count",
	type: ZWrapDTO(ZUnreadCount),
});

export const markNotificationRead = createPatch({
	path: "/notifications/:id/read",
	type: ZWrapDTO(ZSuccess),
});

export const markAllNotificationsRead = createPatch({
	path: "/notifications/read-all",
	type: ZWrapDTO(ZSuccess),
});
